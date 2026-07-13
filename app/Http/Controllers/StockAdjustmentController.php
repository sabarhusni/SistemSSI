<?php

namespace App\Http\Controllers;

use App\Models\StockAdjustment;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockAdjustmentController extends Controller
{
    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'ADJ' . $year;
        $last   = StockAdjustment::where('adjustment_number', 'like', $prefix . '%')
            ->orderBy('adjustment_number', 'desc')
            ->value('adjustment_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function index(Request $request)
    {
        $sortable = ['adjustment_number', 'adjustment_date', 'type', 'quantity_before', 'quantity_after', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'adjustment_date';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = StockAdjustment::with('product')
            ->when($request->search, fn($q, $s) => $q->where('adjustment_number', 'ilike', "%$s%")->orWhereHas('product', fn($pq) => $pq->where('name', 'ilike', "%$s%")))
            ->when($request->type, fn($q, $s) => $q->where('type', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('StockAdjustments/Index', [
            'stockAdjustments' => $query->paginate(15)->withQueryString(),
            'filters'          => $request->only('search', 'type', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('StockAdjustments/Form', [
            'products'   => Product::where('status', 'active')->where('product_type', 'goods')->orderBy('name')->get(['id', 'name', 'stock', 'cost', 'average_cost']),
            'warehouses' => Warehouse::where('status', 'active')->orderBy('name')->get(['id', 'name', 'code']),
            'nextNumber' => $this->generateNextNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id'        => 'required|uuid|exists:products,id',
            'warehouse_id'      => 'nullable|uuid|exists:warehouses,id',
            'adjustment_number' => 'required|string|max:50|unique:stock_adjustments,adjustment_number',
            'adjustment_date'   => 'required|date',
            'type'              => 'required|in:addition,subtraction',
            'quantity_adjusted' => 'required|integer|min:1',
            'reason'            => 'required|string|max:255',
            'notes'             => 'nullable|string',
        ]);

        $data['created_by'] = Auth::id();

        DB::transaction(function () use ($data) {
            $product = Product::lockForUpdate()->findOrFail($data['product_id']);

            $qtyBefore  = (int) ($product->stock ?? 0);
            $qtyAdjust  = (int) $data['quantity_adjusted'];
            $isAddition = $data['type'] === 'addition';

            $qtyAfter  = $isAddition
                ? $qtyBefore + $qtyAdjust
                : max(0, $qtyBefore - $qtyAdjust);
            $actualDelta = $qtyAfter - $qtyBefore; // bisa negatif saat subtraction

            $data['quantity_before'] = $qtyBefore;
            $data['quantity_after']  = $qtyAfter;

            $adjustment = StockAdjustment::create($data);

            // --- Update stok ---
            $product->stock = $qtyAfter;

            // Hitung ulang average_cost hanya saat penambahan stok dengan biaya
            $avgCost = $product->average_cost ?? $product->cost ?? 0;
            if ($isAddition && $actualDelta > 0 && $avgCost > 0 && $qtyBefore >= 0) {
                // Penambahan diasumsikan masuk pada average cost yang berlaku
                // Rumus weighted average: ((Q_lama * C_lama) + (Q_tambah * C_lama)) / (Q_lama + Q_tambah) = C_lama
                // Jika stok sebelumnya 0, average_cost tetap (tidak berubah karena tidak ada harga baru)
                // Average cost tidak berubah untuk adjustment (tidak ada harga beli baru)
            }
            $product->save();

            // Update tabel stocks
            $stock = Stock::firstOrNew(['product_id' => $product->id]);
            $stock->quantity = $qtyAfter;
            $stock->save();

            // Audit trail StockMovement
            StockMovement::create([
                'product_id'     => $product->id,
                'type'           => $isAddition ? 'adjustment_in' : 'adjustment_out',
                'quantity'       => abs($actualDelta),
                'reference_id'   => $adjustment->id,
                'reference_type' => 'stock_adjustment',
                'notes'          => ($isAddition ? 'Penambahan' : 'Pengurangan') . ' stok - ' . $adjustment->adjustment_number . ' - ' . $data['reason'],
                'created_by'     => Auth::id(),
            ]);
        });

        return redirect('/stock-adjustments')->with('success', 'Penyesuaian stok berhasil dicatat.');
    }

    public function edit(StockAdjustment $stockAdjustment)
    {
        return Inertia::render('StockAdjustments/Form', [
            'stockAdjustment' => $stockAdjustment,
            'products'        => Product::where('status', 'active')->where('product_type', 'goods')->orderBy('name')->get(['id', 'name', 'stock', 'cost', 'average_cost']),
            'warehouses'      => Warehouse::where('status', 'active')->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function update(Request $request, StockAdjustment $stockAdjustment)
    {
        $data = $request->validate([
            'product_id'        => 'required|uuid|exists:products,id',
            'warehouse_id'      => 'nullable|uuid|exists:warehouses,id',
            'adjustment_number' => 'required|string|max:50|unique:stock_adjustments,adjustment_number,' . $stockAdjustment->id,
            'adjustment_date'   => 'required|date',
            'type'              => 'required|in:addition,subtraction',
            'quantity_adjusted' => 'required|integer|min:1',
            'reason'            => 'required|string|max:255',
            'notes'             => 'nullable|string',
        ]);

        $data['created_by'] = Auth::id();

        DB::transaction(function () use ($data, $stockAdjustment) {
            // --- Balik efek adjustment lama ---
            $oldProduct   = Product::lockForUpdate()->findOrFail($stockAdjustment->product_id);
            $oldDelta     = $stockAdjustment->quantity_after - $stockAdjustment->quantity_before;

            $oldProduct->stock = max(0, (int) ($oldProduct->stock ?? 0) - $oldDelta);
            $oldProduct->save();

            $oldStock = Stock::where('product_id', $oldProduct->id)->first();
            if ($oldStock) {
                $oldStock->quantity = $oldProduct->stock;
                $oldStock->save();
            }

            // --- Terapkan adjustment baru ---
            $newProduct  = Product::lockForUpdate()->findOrFail($data['product_id']);
            $qtyBefore   = (int) ($newProduct->stock ?? 0);
            $qtyAdjust   = (int) $data['quantity_adjusted'];
            $isAddition  = $data['type'] === 'addition';

            $qtyAfter    = $isAddition
                ? $qtyBefore + $qtyAdjust
                : max(0, $qtyBefore - $qtyAdjust);
            $actualDelta = $qtyAfter - $qtyBefore;

            $data['quantity_before'] = $qtyBefore;
            $data['quantity_after']  = $qtyAfter;

            $stockAdjustment->update($data);

            $newProduct->stock = $qtyAfter;
            $newProduct->save();

            $newStock = Stock::firstOrNew(['product_id' => $newProduct->id]);
            $newStock->quantity = $qtyAfter;
            $newStock->save();

            // Perbarui StockMovement (hapus lama, buat baru)
            StockMovement::where('reference_id', $stockAdjustment->id)
                ->where('reference_type', 'stock_adjustment')
                ->delete();

            StockMovement::create([
                'product_id'     => $newProduct->id,
                'type'           => $isAddition ? 'adjustment_in' : 'adjustment_out',
                'quantity'       => abs($actualDelta),
                'reference_id'   => $stockAdjustment->id,
                'reference_type' => 'stock_adjustment',
                'notes'          => ($isAddition ? 'Penambahan' : 'Pengurangan') . ' stok - ' . $data['adjustment_number'] . ' - ' . $data['reason'],
                'created_by'     => Auth::id(),
            ]);
        });

        return redirect('/stock-adjustments')->with('success', 'Penyesuaian stok berhasil diperbarui.');
    }

    public function destroy(StockAdjustment $stockAdjustment)
    {
        DB::transaction(function () use ($stockAdjustment) {
            // Balik efek stok sebelum hapus
            $product = Product::lockForUpdate()->findOrFail($stockAdjustment->product_id);
            $delta   = $stockAdjustment->quantity_after - $stockAdjustment->quantity_before;

            $product->stock = max(0, (int) ($product->stock ?? 0) - $delta);
            $product->save();

            $stock = Stock::where('product_id', $product->id)->first();
            if ($stock) {
                $stock->quantity = $product->stock;
                $stock->save();
            }

            StockMovement::where('reference_id', $stockAdjustment->id)
                ->where('reference_type', 'stock_adjustment')
                ->delete();

            $stockAdjustment->delete();
        });

        return redirect('/stock-adjustments')->with('success', 'Penyesuaian stok berhasil dihapus.');
    }
}

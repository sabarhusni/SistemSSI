<?php

namespace App\Http\Controllers;

use App\Models\StockOpname;
use App\Models\Employee;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockOpnameController extends Controller
{
    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'OP' . $year;
        $last   = StockOpname::where('opname_number', 'like', $prefix . '%')
            ->orderBy('opname_number', 'desc')
            ->value('opname_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Terapkan stok sesuai hasil opname (quantity_physical → stok aktual produk).
     * Dipanggil saat status berubah menjadi 'completed'.
     */
    private function applyStock(StockOpname $opname): void
    {
        foreach ($opname->items as $item) {
            $product = Product::lockForUpdate()->find($item->product_id);
            if (!$product) continue;

            $qtyPhysical = (int) $item->quantity_physical;
            $qtySystem   = (int) $item->quantity_system;
            $diff        = $qtyPhysical - $qtySystem;

            // Setel stok ke hasil hitungan fisik
            $product->stock = $qtyPhysical;
            $product->save();

            $stock = Stock::firstOrNew(['product_id' => $product->id]);
            $stock->quantity = $qtyPhysical;
            $stock->save();

            // Catat StockMovement hanya jika ada selisih
            if ($diff !== 0) {
                StockMovement::create([
                    'product_id'     => $product->id,
                    'type'           => $diff > 0 ? 'opname_in' : 'opname_out',
                    'quantity'       => abs($diff),
                    'reference_id'   => $opname->id,
                    'reference_type' => 'stock_opname',
                    'notes'          => 'Opname ' . $opname->opname_number . ' — selisih ' . ($diff > 0 ? '+' : '') . $diff,
                    'created_by'     => Auth::id(),
                ]);
            }
        }

        $opname->stock_applied = true;
        $opname->save();
    }

    /**
     * Balik efek stok yang sudah diterapkan dari opname ini.
     * Dipanggil saat opname completed diedit atau status berubah dari completed.
     */
    private function reverseStock(StockOpname $opname): void
    {
        foreach ($opname->items as $item) {
            $product = Product::lockForUpdate()->find($item->product_id);
            if (!$product) continue;

            // Kembalikan stok ke nilai system_quantity (sebelum opname diterapkan)
            $qtySystem = (int) $item->quantity_system;

            $product->stock = $qtySystem;
            $product->save();

            $stock = Stock::where('product_id', $product->id)->first();
            if ($stock) {
                $stock->quantity = $qtySystem;
                $stock->save();
            }
        }

        // Hapus semua StockMovement milik opname ini
        StockMovement::where('reference_id', $opname->id)
            ->where('reference_type', 'stock_opname')
            ->delete();

        $opname->stock_applied = false;
        $opname->save();
    }

    public function index(Request $request)
    {
        $sortable = ['opname_number', 'opname_date', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'opname_date';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = StockOpname::withCount('items')->with(['conductedBy', 'warehouseModel'])
            ->when($request->search, fn($q, $s) => $q->where('opname_number', 'ilike', "%$s%")->orWhere('warehouse', 'ilike', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('StockOpnames/Index', [
            'stockOpnames' => $query->paginate(15)->withQueryString(),
            'filters'      => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('StockOpnames/Form', [
            'products'   => Product::where('status', 'active')->where('product_type', 'goods')->orderBy('name')->get(['id', 'name', 'stock']),
            'employees'  => Employee::where('status', 'active')->orderBy('name')->get(['id', 'employee_number', 'name', 'position']),
            'warehouses' => Warehouse::where('status', 'active')->orderBy('name')->get(['id', 'name', 'code']),
            'nextNumber' => $this->generateNextNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'opname_number'   => 'required|string|max:50|unique:stock_opnames,opname_number',
            'warehouse_id'    => 'required|uuid|exists:warehouses,id',
            'opname_date'     => 'required|date',
            'conducted_by_id' => 'nullable|uuid|exists:employees,id',
            'status'          => 'required|in:draft,in_progress,completed,cancelled',
            'notes'           => 'nullable|string',
            'items'           => 'nullable|array',
            'items.*.product_id'        => 'required|uuid|exists:products,id',
            'items.*.system_quantity'   => 'required|integer|min:0',
            'items.*.physical_quantity' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $opname = StockOpname::create(collect($data)->except('items')->toArray());

            foreach (($data['items'] ?? []) as $item) {
                if (!empty($item['product_id'])) {
                    $opname->items()->create([
                        'product_id'        => $item['product_id'],
                        'quantity_system'   => $item['system_quantity'],
                        'quantity_physical' => $item['physical_quantity'],
                        'difference'        => $item['physical_quantity'] - $item['system_quantity'],
                    ]);
                }
            }

            // Terapkan stok langsung jika status sudah completed
            if ($data['status'] === 'completed') {
                $opname->load('items');
                $this->applyStock($opname);
            }
        });

        return redirect('/stock-opnames')->with('success', 'Opname stok berhasil dibuat.');
    }

    public function edit(StockOpname $stockOpname)
    {
        return Inertia::render('StockOpnames/Form', [
            'stockOpname' => $stockOpname->load('items'),
            'products'    => Product::where('status', 'active')->where('product_type', 'goods')->orderBy('name')->get(['id', 'name', 'stock']),
            'employees'  => Employee::where('status', 'active')->orderBy('name')->get(['id', 'employee_number', 'name', 'position']),
            'warehouses'  => Warehouse::where('status', 'active')->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function update(Request $request, StockOpname $stockOpname)
    {
        $data = $request->validate([
            'opname_number'   => 'required|string|max:50|unique:stock_opnames,opname_number,' . $stockOpname->id,
            'warehouse_id'    => 'required|uuid|exists:warehouses,id',
            'opname_date'     => 'required|date',
            'conducted_by_id' => 'nullable|uuid|exists:employees,id',
            'status'          => 'required|in:draft,in_progress,completed,cancelled',
            'notes'           => 'nullable|string',
            'items'           => 'nullable|array',
            'items.*.product_id'        => 'required|uuid|exists:products,id',
            'items.*.system_quantity'   => 'required|integer|min:0',
            'items.*.physical_quantity' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($data, $stockOpname) {
            $wasApplied = (bool) $stockOpname->stock_applied;
            $willComplete = $data['status'] === 'completed';

            // Balik stok lama jika sebelumnya sudah diterapkan
            if ($wasApplied) {
                $stockOpname->load('items');
                $this->reverseStock($stockOpname);
            }

            // Perbarui header dan items
            $stockOpname->update(collect($data)->except('items')->toArray());
            $stockOpname->items()->delete();

            foreach (($data['items'] ?? []) as $item) {
                if (!empty($item['product_id'])) {
                    $stockOpname->items()->create([
                        'product_id'        => $item['product_id'],
                        'quantity_system'   => $item['system_quantity'],
                        'quantity_physical' => $item['physical_quantity'],
                        'difference'        => $item['physical_quantity'] - $item['system_quantity'],
                    ]);
                }
            }

            // Terapkan stok baru jika status completed
            if ($willComplete) {
                $stockOpname->load('items');
                $this->applyStock($stockOpname);
            }
        });

        return redirect('/stock-opnames')->with('success', 'Opname stok berhasil diperbarui.');
    }

    public function destroy(StockOpname $stockOpname)
    {
        DB::transaction(function () use ($stockOpname) {
            // Balik stok jika opname sudah diterapkan
            if ($stockOpname->stock_applied) {
                $stockOpname->load('items');
                $this->reverseStock($stockOpname);
            }

            $stockOpname->items()->delete();
            $stockOpname->delete();
        });

        return redirect('/stock-opnames')->with('success', 'Opname stok berhasil dihapus.');
    }
}

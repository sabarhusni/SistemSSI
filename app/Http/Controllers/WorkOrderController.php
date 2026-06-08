<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use App\Models\Contract;
use App\Models\SalesOrder;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['wo_number', 'visit_date', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = WorkOrder::with(['technician', 'salesOrder', 'contract'])
            ->when($request->search, fn($q, $s) => $q->where('wo_number', 'ilike', "%$s%")->orWhereHas('technician', fn($tq) => $tq->where('name', 'ilike', "%$s%")))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->contract_id, fn($q, $v) => $q->where('contract_id', $v))
            ->when($request->sales_order_id, fn($q, $v) => $q->where('sales_order_id', $v))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('WorkOrders/Index', [
            'workOrders'  => $query->paginate(15)->withQueryString(),
            'filters'     => $request->only('search', 'status', 'contract_id', 'sales_order_id', 'sort_by', 'sort_dir'),
            'contracts'   => Contract::whereHas('workOrders')->orderBy('contract_number')->get(['id', 'contract_number']),
            'salesOrders' => SalesOrder::whereHas('workOrders')->orderBy('so_number')->get(['id', 'so_number']),
        ]);
    }

    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'WO' . $year;
        $last   = WorkOrder::where('wo_number', 'like', $prefix . '%')
            ->orderBy('wo_number', 'desc')
            ->value('wo_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('WorkOrders/Form', [
            'technicians' => User::where('status', 'active')->orderBy('name')->get(),
            'products'    => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'unit', 'stock', 'product_type']),
            // Hanya kontrak aktif yang punya minimal satu Sales Order berstatus confirmed.
            'contracts'   => Contract::where('status', 'active')
                ->whereHas('salesOrders', fn($q) => $q->where('status', 'confirmed'))
                ->with([
                    'customer',
                    'salesOrders' => fn($q) => $q->where('status', 'confirmed')->orderBy('so_number')
                        ->with(['items.product', 'visitPlans', 'premise', 'workOrders:id,sales_order_id,visit_date']),
                ])
                ->orderBy('contract_number')
                ->get(['id', 'contract_number', 'customer_id', 'duration_months', 'start_date', 'end_date']),
            'nextNumber'  => $this->generateNextNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'wo_number'        => 'required|string|max:50|unique:work_orders,wo_number',
            'contract_id'         => 'nullable|uuid|exists:contracts,id',
            'sales_order_id'      => 'nullable|uuid|exists:sales_orders,id',
            'sales_order_item_id' => 'nullable|uuid|exists:sales_order_items,id',
            'technician_id'    => 'nullable|uuid|exists:users,id',
            'visit_date'       => 'required|date',
            'time_in'          => 'nullable|date_format:H:i,H:i:s',
            'time_out'         => 'nullable|date_format:H:i,H:i:s',
            'service_area'     => 'required|string|max:255',
            'visit_types'      => 'nullable|array',
            'visit_types.*'    => 'in:routine,complaint,followup',
            'status'           => 'required|in:pending,in_progress,completed,cancelled',
            'technician_notes' => 'nullable|string',
            'materials'        => 'nullable|array',
            'materials.*.product_id'        => 'required|uuid|exists:products,id',
            'materials.*.parent_product_id' => 'nullable|uuid|exists:products,id',
            'materials.*.month'             => 'nullable|integer|min:1',
            'materials.*.uom'               => 'nullable|string|max:50',
            'materials.*.quantity_used'     => 'required|numeric|min:0',
        ]);

        if (empty($data['wo_number'])) {
            $data['wo_number'] = $this->generateNextNumber();
        }

        // Auto-fill contract_id from SO if not set
        if (empty($data['contract_id']) && !empty($data['sales_order_id'])) {
            $data['contract_id'] = SalesOrder::find($data['sales_order_id'])?->contract_id;
        }

        // Satu tanggal visit pada satu SO hanya boleh dipakai satu Work Order.
        if (!empty($data['sales_order_id']) && !empty($data['visit_date'])
            && WorkOrder::where('sales_order_id', $data['sales_order_id'])->whereDate('visit_date', $data['visit_date'])->exists()) {
            return back()->withErrors(['visit_date' => 'Tanggal visit ini sudah digunakan pada Work Order lain untuk SO yang sama.'])->withInput();
        }

        DB::transaction(function () use ($data) {
            $wo = WorkOrder::create(collect($data)->except('materials')->toArray());

            foreach (($data['materials'] ?? []) as $mat) {
                if (!empty($mat['product_id'])) {
                    $wo->materials()->create([
                        'product_id'        => $mat['product_id'],
                        'parent_product_id' => $mat['parent_product_id'] ?? null,
                        'month'             => $mat['month'] ?? 1,
                        'uom'               => $mat['uom'] ?? null,
                        'quantity_used'     => $mat['quantity_used'],
                    ]);
                }
            }

            // Status Completed langsung mengurangi stok sub-produk yang dipakai.
            if (($data['status'] ?? null) === 'completed') {
                $this->deductStockForMaterials($wo);
            }
        });

        return redirect('/work-orders')->with('success', 'Work Order berhasil dibuat.');
    }

    public function edit(WorkOrder $workOrder)
    {
        return Inertia::render('WorkOrders/Form', [
            'workOrder'   => $workOrder->load(['materials', 'salesOrder', 'salesOrderItem', 'contract']),
            'technicians' => User::where('status', 'active')->orderBy('name')->get(),
            'products'    => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'unit', 'stock', 'product_type']),
            'contracts'   => Contract::whereIn('status', ['active', 'completed'])
                ->where(fn($q) => $q->whereHas('salesOrders', fn($s) => $s->where('status', 'confirmed'))->orWhere('id', $workOrder->contract_id))
                ->with([
                    'customer',
                    'salesOrders' => fn($q) => $q->whereIn('status', ['confirmed', 'active', 'completed'])->orderBy('so_number')
                        ->with(['items.product', 'visitPlans', 'premise', 'workOrders:id,sales_order_id,visit_date']),
                ])
                ->orderBy('contract_number')
                ->get(['id', 'contract_number', 'customer_id', 'duration_months', 'start_date', 'end_date']),
            // WO yang sudah Completed hanya bisa dilihat (read-only).
            'locked'      => $workOrder->status === 'completed',
        ]);
    }

    public function update(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'wo_number'        => 'required|string|max:50|unique:work_orders,wo_number,' . $workOrder->id,
            'contract_id'         => 'nullable|uuid|exists:contracts,id',
            'sales_order_id'      => 'nullable|uuid|exists:sales_orders,id',
            'sales_order_item_id' => 'nullable|uuid|exists:sales_order_items,id',
            'technician_id'    => 'nullable|uuid|exists:users,id',
            'visit_date'       => 'required|date',
            'time_in'          => 'nullable|date_format:H:i,H:i:s',
            'time_out'         => 'nullable|date_format:H:i,H:i:s',
            'service_area'     => 'required|string|max:255',
            'visit_types'      => 'nullable|array',
            'visit_types.*'    => 'in:routine,complaint,followup',
            'status'           => 'required|in:pending,in_progress,completed,cancelled',
            'technician_notes' => 'nullable|string',
            'materials'        => 'nullable|array',
            'materials.*.product_id'        => 'required|uuid|exists:products,id',
            'materials.*.parent_product_id' => 'nullable|uuid|exists:products,id',
            'materials.*.month'             => 'nullable|integer|min:1',
            'materials.*.uom'               => 'nullable|string|max:50',
            'materials.*.quantity_used'     => 'required|numeric|min:0',
        ]);

        // WO yang sudah Completed dikunci (read-only) dan tidak bisa diubah lagi.
        if ($workOrder->status === 'completed') {
            return back()->withErrors(['status' => 'Work Order yang sudah Completed tidak dapat diubah.'])->withInput();
        }

        if (empty($data['contract_id']) && !empty($data['sales_order_id'])) {
            $data['contract_id'] = SalesOrder::find($data['sales_order_id'])?->contract_id;
        }

        // Satu tanggal visit pada satu SO hanya boleh dipakai satu Work Order (selain WO ini).
        if (!empty($data['sales_order_id']) && !empty($data['visit_date'])
            && WorkOrder::where('sales_order_id', $data['sales_order_id'])->whereDate('visit_date', $data['visit_date'])
                ->where('id', '!=', $workOrder->id)->exists()) {
            return back()->withErrors(['visit_date' => 'Tanggal visit ini sudah digunakan pada Work Order lain untuk SO yang sama.'])->withInput();
        }

        DB::transaction(function () use ($data, $workOrder) {
            $workOrder->update(collect($data)->except('materials')->toArray());

            // Hard delete agar tidak menyisakan baris soft-deleted saat material disusun ulang.
            $workOrder->materials()->forceDelete();

            foreach (($data['materials'] ?? []) as $mat) {
                if (!empty($mat['product_id'])) {
                    $workOrder->materials()->create([
                        'product_id'        => $mat['product_id'],
                        'parent_product_id' => $mat['parent_product_id'] ?? null,
                        'month'             => $mat['month'] ?? 1,
                        'uom'               => $mat['uom'] ?? null,
                        'quantity_used'     => $mat['quantity_used'],
                    ]);
                }
            }

            // Transisi ke Completed: kurangi stok sub-produk yang dipakai.
            // (WO lama dijamin belum Completed karena diblok di atas, jadi tak ada dobel potong.)
            if (($data['status'] ?? null) === 'completed') {
                $this->deductStockForMaterials($workOrder->fresh('materials'));
            }
        });

        return redirect('/work-orders')->with('success', 'Work Order berhasil diperbarui.');
    }

    public function destroy(WorkOrder $workOrder)
    {
        DB::transaction(function () use ($workOrder) {
            // Kembalikan stok bila WO yang dihapus sudah Completed (stok sempat dipotong).
            if ($workOrder->status === 'completed') {
                $this->restoreStockForMaterials($workOrder);
            }
            $workOrder->delete();
        });

        return redirect('/work-orders')->with('success', 'Work Order berhasil dihapus.');
    }

    /**
     * Kurangi stok untuk tiap sub-produk (parent_product_id terisi) yang dipakai WO.
     * Catatan: kolom stok bertipe integer, qty pecahan dibulatkan ke bilangan terdekat.
     */
    private function deductStockForMaterials(WorkOrder $workOrder): void
    {
        $subs = $workOrder->materials()->whereNotNull('parent_product_id')->get();

        foreach ($subs as $mat) {
            $qty = (int) round((float) $mat->quantity_used);
            if ($qty <= 0) continue;

            $product = Product::lockForUpdate()->find($mat->product_id);
            if (!$product) continue;

            $after = max(0, (int) ($product->stock ?? 0) - $qty);
            $product->stock = $after;
            $product->save();

            $stock = Stock::firstOrNew(['product_id' => $product->id]);
            $stock->quantity = $after;
            $stock->save();

            StockMovement::create([
                'product_id'     => $product->id,
                'type'           => 'work_order_out',
                'quantity'       => $qty,
                'reference_id'   => $workOrder->id,
                'reference_type' => 'work_order',
                'notes'          => 'Pemakaian material Work Order ' . $workOrder->wo_number,
                'created_by'     => Auth::id(),
            ]);
        }
    }

    /**
     * Kembalikan stok yang sempat dipotong oleh WO (saat WO Completed dihapus).
     */
    private function restoreStockForMaterials(WorkOrder $workOrder): void
    {
        $subs = $workOrder->materials()->whereNotNull('parent_product_id')->get();

        foreach ($subs as $mat) {
            $qty = (int) round((float) $mat->quantity_used);
            if ($qty <= 0) continue;

            $product = Product::lockForUpdate()->find($mat->product_id);
            if (!$product) continue;

            $after = (int) ($product->stock ?? 0) + $qty;
            $product->stock = $after;
            $product->save();

            $stock = Stock::firstOrNew(['product_id' => $product->id]);
            $stock->quantity = $after;
            $stock->save();
        }

        StockMovement::where('reference_type', 'work_order')
            ->where('reference_id', $workOrder->id)
            ->delete();
    }

    public function print(WorkOrder $workOrder)
    {
        $workOrder->load([
            'contract.customer',
            'salesOrder.premise',
            'salesOrder.visitPlans',
            'salesOrderItem.product',
            'technician',
            'materials.product',
        ]);

        return Inertia::render('WorkOrders/Print', [
            'workOrder'   => $workOrder,
            'companyName' => Setting::get('company_name', ''),
        ]);
    }
}

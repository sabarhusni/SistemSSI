<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use App\Models\Contract;
use App\Models\SalesOrder;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
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
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('WorkOrders/Index', [
            'workOrders' => $query->paginate(15)->withQueryString(),
            'filters'    => $request->only('search', 'status', 'sort_by', 'sort_dir'),
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
            'products'    => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit', 'stock', 'product_type']),
            'contracts'   => Contract::where('status', 'active')
                ->with(['customer', 'salesOrders' => fn($q) => $q->whereIn('status', ['confirmed', 'active'])->orderBy('so_number')])
                ->orderBy('contract_number')
                ->get(['id', 'contract_number', 'customer_id', 'service_area', 'visit_frequency', 'visit_frequency_unit', 'start_date', 'end_date']),
            'nextNumber'  => $this->generateNextNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'wo_number'        => 'required|string|max:50|unique:work_orders,wo_number',
            'contract_id'      => 'nullable|uuid|exists:contracts,id',
            'sales_order_id'   => 'nullable|uuid|exists:sales_orders,id',
            'technician_id'    => 'nullable|uuid|exists:users,id',
            'visit_date'       => 'required|date',
            'time_in'          => 'nullable|date_format:H:i',
            'time_out'         => 'nullable|date_format:H:i',
            'service_area'     => 'required|string|max:255',
            'visit_types'      => 'nullable|array',
            'visit_types.*'    => 'in:routine,complaint,followup',
            'status'           => 'required|in:pending,in_progress,completed,cancelled',
            'technician_notes' => 'nullable|string',
            'materials'        => 'nullable|array',
            'materials.*.product_id'    => 'required|uuid|exists:products,id',
            'materials.*.quantity_used' => 'required|integer|min:1',
        ]);

        // Validasi duplikat product_id di materials
        if (!empty($data['materials'])) {
            $productIds = array_column($data['materials'], 'product_id');
            $uniqueIds = array_unique($productIds);
            if (count($productIds) !== count($uniqueIds)) {
                return back()->withErrors(['materials' => 'Produk tidak boleh duplikat dalam material work order.'])->withInput();
            }
        }

        if (empty($data['wo_number'])) {
            $data['wo_number'] = $this->generateNextNumber();
        }

        // Auto-fill contract_id from SO if not set
        if (empty($data['contract_id']) && !empty($data['sales_order_id'])) {
            $data['contract_id'] = SalesOrder::find($data['sales_order_id'])?->contract_id;
        }

        DB::transaction(function () use ($data) {
            $wo = WorkOrder::create(collect($data)->except('materials')->toArray());

            foreach (($data['materials'] ?? []) as $mat) {
                if (!empty($mat['product_id'])) {
                    $wo->materials()->create([
                        'product_id'    => $mat['product_id'],
                        'quantity_used' => $mat['quantity_used'],
                    ]);
                }
            }
        });

        return redirect('/work-orders')->with('success', 'Work Order berhasil dibuat.');
    }

    public function edit(WorkOrder $workOrder)
    {
        return Inertia::render('WorkOrders/Form', [
            'workOrder'   => $workOrder->load(['materials', 'salesOrder', 'contract']),
            'technicians' => User::where('status', 'active')->orderBy('name')->get(),
            'products'    => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit', 'stock', 'product_type']),
            'contracts'   => Contract::whereIn('status', ['active', 'completed'])
                ->with(['customer', 'salesOrders' => fn($q) => $q->whereIn('status', ['confirmed', 'active', 'completed'])->orderBy('so_number')])
                ->orderBy('contract_number')
                ->get(['id', 'contract_number', 'customer_id', 'service_area', 'visit_frequency', 'visit_frequency_unit', 'start_date', 'end_date']),
        ]);
    }

    public function update(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'wo_number'        => 'required|string|max:50|unique:work_orders,wo_number,' . $workOrder->id,
            'contract_id'      => 'nullable|uuid|exists:contracts,id',
            'sales_order_id'   => 'nullable|uuid|exists:sales_orders,id',
            'technician_id'    => 'nullable|uuid|exists:users,id',
            'visit_date'       => 'required|date',
            'time_in'          => 'nullable|date_format:H:i',
            'time_out'         => 'nullable|date_format:H:i',
            'service_area'     => 'required|string|max:255',
            'visit_types'      => 'nullable|array',
            'visit_types.*'    => 'in:routine,complaint,followup',
            'status'           => 'required|in:pending,in_progress,completed,cancelled',
            'technician_notes' => 'nullable|string',
            'materials'        => 'nullable|array',
            'materials.*.product_id'    => 'required|uuid|exists:products,id',
            'materials.*.quantity_used' => 'required|integer|min:1',
        ]);

        // Validasi duplikat product_id di materials
        if (!empty($data['materials'])) {
            $productIds = array_column($data['materials'], 'product_id');
            $uniqueIds = array_unique($productIds);
            if (count($productIds) !== count($uniqueIds)) {
                return back()->withErrors(['materials' => 'Produk tidak boleh duplikat dalam material work order.'])->withInput();
            }
        }

        if (empty($data['contract_id']) && !empty($data['sales_order_id'])) {
            $data['contract_id'] = SalesOrder::find($data['sales_order_id'])?->contract_id;
        }

        DB::transaction(function () use ($data, $workOrder) {
            $workOrder->update(collect($data)->except('materials')->toArray());
            $workOrder->materials()->delete();

            foreach (($data['materials'] ?? []) as $mat) {
                if (!empty($mat['product_id'])) {
                    $workOrder->materials()->create([
                        'product_id'    => $mat['product_id'],
                        'quantity_used' => $mat['quantity_used'],
                    ]);
                }
            }
        });

        return redirect('/work-orders')->with('success', 'Work Order berhasil diperbarui.');
    }

    public function destroy(WorkOrder $workOrder)
    {
        $workOrder->delete();

        return redirect('/work-orders')->with('success', 'Work Order berhasil dihapus.');
    }
}

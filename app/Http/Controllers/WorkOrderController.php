<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use App\Models\Contract;
use App\Models\Employee;
use App\Models\SalesOrder;
use App\Models\Product;
use App\Models\SalesOrderVisitPlan;
use App\Models\Setting;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\WorkOrderMaterial;
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
            ->when($request->service_type, fn($q, $v) => $q->whereHas('contract', fn($cq) => $cq->where('service_type', $v)))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('WorkOrders/Index', [
            'workOrders'  => $query->paginate(15)->withQueryString(),
            'filters'     => $request->only('search', 'status', 'contract_id', 'sales_order_id', 'service_type', 'sort_by', 'sort_dir'),
            'contracts'   => Contract::whereHas('workOrders')->orderBy('contract_number')->get(['id', 'contract_number']),
            'salesOrders' => SalesOrder::whereHas('workOrders')->orderBy('so_number')->get(['id', 'so_number']),
        ]);
    }

    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'WO' . $year;
        $last   = WorkOrder::withTrashed()->where('wo_number', 'like', $prefix . '%')
            ->where('deleted_at', null) // Hanya ambil WO yang belum dihapus
            ->orderBy('wo_number', 'desc')
            ->value('wo_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('WorkOrders/Form', [
            'technicians' => Employee::where('status', 'active')->orderBy('name')->get(['id', 'employee_number', 'name', 'position']),
            'products'    => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'unit', 'stock', 'product_type']),
            // Hanya kontrak aktif yang punya minimal satu Sales Order berstatus confirmed.
            'contracts'   => Contract::where('status', 'active')
                ->whereHas('salesOrders', fn($q) => $q->where('status', 'confirmed'))
                ->with([
                    'customer',
                    'salesOrders' => fn($q) => $q->where('status', 'confirmed')->orderBy('so_number')
                        ->with(['items.product', 'visitPlans', 'premise',
                            'workOrders' => fn($w) => $w->select('id', 'sales_order_id', 'visit_date', 'sales_order_visit_plan_id')
                                ->where('status', '!=', 'cancelled')
                                ->with('materials:id,work_order_id,parent_product_id,product_id,month,quantity_used'),
                        ]),
                ])
                ->orderBy('contract_number')
                ->get(['id', 'contract_number', 'customer_id', 'duration_months', 'start_date', 'end_date', 'service_type']),
            'nextNumber'  => $this->generateNextNumber(),
            // Penugasan teknisi yang sudah ada (untuk cek bentrok jadwal per tanggal visit).
            'technicianBookings' => WorkOrder::whereNotNull('technician_id')
                ->whereNotIn('status', ['cancelled'])
                ->get(['id', 'technician_id', 'visit_date', 'wo_number', 'time_in', 'time_out']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'wo_number'        => 'required|string|max:50',
            'contract_id'         => 'nullable|uuid|exists:contracts,id',
            'sales_order_id'      => 'nullable|uuid|exists:sales_orders,id',
            'sales_order_item_id' => 'nullable|uuid|exists:sales_order_items,id',
            'sales_order_visit_plan_id' => 'nullable|uuid|exists:sales_order_visit_plans,id',
            'month'            => 'nullable|integer|min:1',
            'technician_id'    => 'nullable|uuid|exists:employees,id',
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
            'materials.*.method_of_application' => 'nullable|string|max:255',
            'materials.*.quantity_used'     => 'required|numeric|min:0',
        ]);

        if (empty($data['wo_number'])) {
            $data['wo_number'] = $this->generateNextNumber();
        }

        // Auto-fill contract_id from SO if not set
        if (empty($data['contract_id']) && !empty($data['sales_order_id'])) {
            $data['contract_id'] = SalesOrder::find($data['sales_order_id'])?->contract_id;
        }

        // Satu tanggal visit pada satu SO hanya boleh dipakai satu Work Order aktif.
        // WO yang Cancelled tidak menahan tanggal, sehingga tanggalnya bisa dipakai WO baru.
        if (!empty($data['sales_order_id']) && !empty($data['visit_date'])
            && WorkOrder::where('sales_order_id', $data['sales_order_id'])->whereDate('visit_date', $data['visit_date'])
                ->where('status', '!=', 'cancelled')->exists()) {
            return back()->withErrors(['visit_date' => 'Tanggal visit ini sudah digunakan pada Work Order lain untuk SO yang sama.'])->withInput();
        }

        // Teknisi boleh menangani beberapa WO di hari yang sama selama jamnya tidak bertabrakan.
        if ($conflict = $this->technicianScheduleConflict($data)) {
            return back()->withErrors(['technician_id' => "Jadwal teknisi bentrok dengan Work Order {$conflict} pada jam yang beririsan."])->withInput();
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
                        'method_of_application' => $mat['method_of_application'] ?? null,
                        'quantity_used'     => $mat['quantity_used'],
                    ]);
                }
            }

            // Req 4: produk & sub-produk baru di WO ikut menambah item Sales Order
            // (dicocokkan per No SO, premis, dan bulan).
            $this->syncSalesOrderItems($wo);

            // Tanggal Visit yang diisi di WO menimpa tanggal Visit Plan SO (visit terpilih).
            $this->syncVisitPlanDate($wo);

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
            'technicians' => Employee::where('status', 'active')->orderBy('name')->get(['id', 'employee_number', 'name', 'position']),
            'products'    => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'unit', 'stock', 'product_type']),
            'contracts'   => Contract::whereIn('status', ['active', 'completed'])
                ->where(fn($q) => $q->whereHas('salesOrders', fn($s) => $s->where('status', 'confirmed'))->orWhere('id', $workOrder->contract_id))
                ->with([
                    'customer',
                    'salesOrders' => fn($q) => $q->whereIn('status', ['confirmed', 'active', 'completed'])->orderBy('so_number')
                        ->with(['items.product', 'visitPlans', 'premise',
                            'workOrders' => fn($w) => $w->select('id', 'sales_order_id', 'visit_date', 'sales_order_visit_plan_id')
                                ->where('status', '!=', 'cancelled')
                                ->with('materials:id,work_order_id,parent_product_id,product_id,month,quantity_used'),
                        ]),
                ])
                ->orderBy('contract_number')
                ->get(['id', 'contract_number', 'customer_id', 'duration_months', 'start_date', 'end_date', 'service_type']),
            // Penugasan teknisi yang sudah ada (untuk cek bentrok jadwal per tanggal visit).
            'technicianBookings' => WorkOrder::whereNotNull('technician_id')
                ->whereNotIn('status', ['cancelled'])
                ->get(['id', 'technician_id', 'visit_date', 'wo_number', 'time_in', 'time_out']),
            // WO yang sudah Completed hanya bisa dilihat (read-only).
            'locked'      => $workOrder->status === 'completed',
        ]);
    }

    public function update(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'wo_number'        => 'required|string|max:50',
            'contract_id'         => 'nullable|uuid|exists:contracts,id',
            'sales_order_id'      => 'nullable|uuid|exists:sales_orders,id',
            'sales_order_item_id' => 'nullable|uuid|exists:sales_order_items,id',
            'sales_order_visit_plan_id' => 'nullable|uuid|exists:sales_order_visit_plans,id',
            'month'            => 'nullable|integer|min:1',
            'technician_id'    => 'nullable|uuid|exists:employees,id',
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
            'materials.*.method_of_application' => 'nullable|string|max:255',
            'materials.*.quantity_used'     => 'required|numeric|min:0',
        ]);

        // WO yang sudah Completed dikunci (read-only) dan tidak bisa diubah lagi.
        if ($workOrder->status === 'completed') {
            return back()->withErrors(['status' => 'Work Order yang sudah Completed tidak dapat diubah.'])->withInput();
        }

        if (empty($data['contract_id']) && !empty($data['sales_order_id'])) {
            $data['contract_id'] = SalesOrder::find($data['sales_order_id'])?->contract_id;
        }

        // Satu tanggal visit pada satu SO hanya boleh dipakai satu Work Order aktif (selain WO ini).
        // WO yang Cancelled tidak menahan tanggal, sehingga tanggalnya bisa dipakai WO baru.
        if (!empty($data['sales_order_id']) && !empty($data['visit_date'])
            && WorkOrder::where('sales_order_id', $data['sales_order_id'])->whereDate('visit_date', $data['visit_date'])
                ->where('status', '!=', 'cancelled')
                ->where('id', '!=', $workOrder->id)->exists()) {
            return back()->withErrors(['visit_date' => 'Tanggal visit ini sudah digunakan pada Work Order lain untuk SO yang sama.'])->withInput();
        }

        // Teknisi boleh menangani beberapa WO di hari yang sama selama jamnya tidak bertabrakan (selain WO ini).
        if ($conflict = $this->technicianScheduleConflict($data, $workOrder->id)) {
            return back()->withErrors(['technician_id' => "Jadwal teknisi bentrok dengan Work Order {$conflict} pada jam yang beririsan."])->withInput();
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
                        'method_of_application' => $mat['method_of_application'] ?? null,
                        'quantity_used'     => $mat['quantity_used'],
                    ]);
                }
            }

            // Req 4: sinkronkan produk & sub-produk baru WO ke item Sales Order.
            $this->syncSalesOrderItems($workOrder);

            // Tanggal Visit yang diubah di WO menimpa tanggal Visit Plan SO (visit terpilih).
            $this->syncVisitPlanDate($workOrder);

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
        if ($workOrder->status === 'completed') {
            return redirect('/work-orders')->with('error', 'Work Order dengan status Completed tidak bisa dihapus.');
        }

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
     * Cek bentrok jadwal teknisi: kembalikan nomor WO yang jamnya beririsan pada tanggal
     * visit yang sama, atau null bila tidak ada bentrok. Teknisi boleh menangani beberapa WO
     * di hari yang sama selama rentang time_in–time_out tidak bertabrakan. Bila salah satu WO
     * belum mengisi jam lengkap, bentrok tidak dapat disimpulkan sehingga dianggap tidak bentrok.
     */
    private function technicianScheduleConflict(array $data, ?string $excludeId = null): ?string
    {
        if (empty($data['technician_id']) || empty($data['visit_date'])) {
            return null;
        }

        $others = WorkOrder::where('technician_id', $data['technician_id'])
            ->whereDate('visit_date', $data['visit_date'])
            ->whereNotIn('status', ['cancelled'])
            ->when($excludeId, fn($q, $id) => $q->where('id', '!=', $id))
            ->get(['wo_number', 'time_in', 'time_out']);

        foreach ($others as $other) {
            if ($this->timesOverlap($data['time_in'] ?? null, $data['time_out'] ?? null, $other->time_in, $other->time_out)) {
                return $other->wo_number;
            }
        }

        return null;
    }

    /**
     * Dua rentang waktu (HH:MM atau HH:MM:SS) dianggap bentrok hanya bila keduanya lengkap,
     * valid (akhir > awal), dan saling beririsan. Batas yang bersentuhan (mis. 10:00–11:00
     * dengan 11:00–12:00) tidak dianggap bentrok.
     */
    private function timesOverlap(?string $aIn, ?string $aOut, ?string $bIn, ?string $bOut): bool
    {
        $toMin = function (?string $t): ?int {
            if (!$t) return null;
            $p = explode(':', $t);
            if (count($p) < 2) return null;
            return (int) $p[0] * 60 + (int) $p[1];
        };

        $a1 = $toMin($aIn); $a2 = $toMin($aOut);
        $b1 = $toMin($bIn); $b2 = $toMin($bOut);

        if ($a1 === null || $a2 === null || $b1 === null || $b2 === null) return false;
        if ($a2 <= $a1 || $b2 <= $b1) return false;

        return $a1 < $b2 && $b1 < $a2;
    }

    /**
     * Req 4: Sinkronkan produk & sub-produk baru pada Work Order ke item Sales Order.
     * Item SO yang belum ada (dicocokkan per product_id, parent_product_id, dan bulan)
     * ditambahkan. Premis terikat pada SO, sehingga pencocokan per-SO sudah mencakup premis.
     * Hanya menambah item baru; item rencana SO yang sudah ada tidak diubah.
     */
    private function syncSalesOrderItems(WorkOrder $workOrder): void
    {
        if (empty($workOrder->sales_order_id)) {
            return;
        }

        $so = SalesOrder::with('items')->find($workOrder->sales_order_id);
        if (!$so) {
            return;
        }

        // Agregasi seluruh pemakaian material pada SO ini per (parent, produk, bulan).
        $groups = WorkOrderMaterial::whereHas('workOrder', fn($q) => $q->where('sales_order_id', $so->id))
            ->get()
            ->groupBy(fn($m) => ($m->parent_product_id ?? '') . '|' . $m->product_id . '|' . (int) ($m->month ?? 1));

        foreach ($groups as $group) {
            $mat   = $group->first();
            $month = (int) ($mat->month ?? 1);

            $exists = $so->items->first(fn($it) =>
                (string) $it->product_id === (string) $mat->product_id
                && (string) ($it->parent_product_id ?? '') === (string) ($mat->parent_product_id ?? '')
                && (int) ($it->month ?? 1) === $month
            );
            if ($exists) {
                continue;
            }

            $so->items()->create([
                'product_id'        => $mat->product_id,
                'parent_product_id' => $mat->parent_product_id,
                'month'             => $month,
                'quantity'          => $group->sum('quantity_used'),
                'uom'               => $mat->uom,
                'uom_conversion'    => 1,
                'unit_price'        => 0,
                'tax_rate'          => 0,
                'tax_amount'        => 0,
                'subtotal'          => 0,
            ]);
        }
    }

    /**
     * Tanggal Visit pada Work Order menimpa tanggal Visit Plan SO untuk visit yang dipilih.
     * Hanya berlaku bila WO menunjuk visit plan (sales_order_visit_plan_id) milik SO yang sama.
     */
    private function syncVisitPlanDate(WorkOrder $workOrder): void
    {
        if (empty($workOrder->sales_order_visit_plan_id) || empty($workOrder->visit_date)) {
            return;
        }

        $plan = SalesOrderVisitPlan::find($workOrder->sales_order_visit_plan_id);
        if (!$plan) {
            return;
        }

        // Pastikan visit plan benar-benar milik SO Work Order ini.
        if ($workOrder->sales_order_id && (string) $plan->sales_order_id !== (string) $workOrder->sales_order_id) {
            return;
        }

        $newDate = $workOrder->visit_date instanceof \DateTimeInterface
            ? $workOrder->visit_date->format('Y-m-d')
            : (string) $workOrder->visit_date;
        $oldDate = $plan->visit_date instanceof \DateTimeInterface
            ? $plan->visit_date->format('Y-m-d')
            : (string) $plan->visit_date;

        if ($newDate !== $oldDate) {
            $plan->visit_date = $newDate;
            $plan->save();
        }
    }

    /**
     * Kurangi stok untuk tiap material WO (parent maupun sub-produk) yang produknya
     * bertipe "goods" — produk bertipe "service" tidak mempengaruhi stok.
     * Catatan: kolom stok bertipe integer, qty pecahan dibulatkan ke bilangan terdekat.
     */
    private function deductStockForMaterials(WorkOrder $workOrder): void
    {
        $materials = $workOrder->materials()->get();

        foreach ($materials as $mat) {
            $qty = (int) round((float) $mat->quantity_used);
            if ($qty <= 0) continue;

            $product = Product::lockForUpdate()->find($mat->product_id);
            if (!$product || $product->product_type !== 'goods') continue;

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
     * Hanya produk bertipe "goods" yang stoknya sempat dipotong (lihat deductStockForMaterials).
     */
    private function restoreStockForMaterials(WorkOrder $workOrder): void
    {
        $materials = $workOrder->materials()->get();

        foreach ($materials as $mat) {
            $qty = (int) round((float) $mat->quantity_used);
            if ($qty <= 0) continue;

            $product = Product::lockForUpdate()->find($mat->product_id);
            if (!$product || $product->product_type !== 'goods') continue;

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
            'salesOrder.premise.services.product',
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

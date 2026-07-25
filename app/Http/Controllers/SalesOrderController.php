<?php

namespace App\Http\Controllers;

use App\Models\SalesOrder;
use App\Models\Contract;
use App\Models\ContractPremise;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Setting;
use App\Models\UnitOfMeasure;
use App\Models\WorkOrderMaterial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesOrderController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['so_number', 'order_date', 'total_amount', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = SalesOrder::with([
                'customer', 'salesPerson',
                'contract:id,contract_number,service_type',
                'premise:id,location,address,pic',
            ])
            ->withCount(['items', 'workOrders'])
            ->when($request->search, fn($q, $s) => $q->where('so_number', 'ilike', "%$s%")->orWhereHas('customer', fn($cq) => $cq->where('name', 'ilike', "%$s%")))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->contract_id, fn($q, $v) => $q->where('contract_id', $v))
            ->when($request->contract_premise_id, fn($q, $v) => $q->where('contract_premise_id', $v))
            ->when($request->service_type, fn($q, $v) => $q->whereHas('contract', fn($cq) => $cq->where('service_type', $v)))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('SalesOrders/Index', [
            'salesOrders' => $query->paginate(15)->withQueryString(),
            'filters'     => $request->only('search', 'status', 'contract_id', 'contract_premise_id', 'service_type', 'sort_by', 'sort_dir'),
            'contracts'   => Contract::whereHas('salesOrders')->orderBy('contract_number')->get(['id', 'contract_number']),
            'premises'    => ContractPremise::whereIn('id', SalesOrder::query()->whereNotNull('contract_premise_id')->distinct()->pluck('contract_premise_id'))
                ->orderBy('location')->get(['id', 'location']),
        ]);
    }

    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'SO' . $year;
        $last   = SalesOrder::withTrashed()->where('so_number', 'like', $prefix . '%')
            ->where('deleted_at', null) // Hanya ambil SO yang belum dihapus
            ->orderBy('so_number', 'desc')
            ->value('so_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('SalesOrders/Form', [
            'contracts'  => Contract::with([
                    'customer',
                    'premises.services.product',
                    'premises.services.uom',
                    'premises.services.subProducts.product',
                    'premises.services.subProducts.uom',
                ])
                ->where('status', 'active')
                ->orderBy('contract_number')
                ->get(),
            'products'   => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'unit', 'price', 'sales_price', 'product_type']),
            'uoms'       => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
            'nextNumber' => $this->generateNextNumber(),
            'taxType'    => Setting::get('tax_type', 'exclude'),
            'taxRateSo'  => (float) Setting::get('tax_rate_so', 11),
            // Premis yang sudah tersimpan di Sales Order lain tidak boleh dipilih lagi.
            'usedPremiseIds' => SalesOrder::whereNotNull('contract_premise_id')->distinct()->pluck('contract_premise_id'),
            // SO baru belum punya invoice sendiri, sehingga belum ada Settlement Amount.
            'settlementAmount' => 0,
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        // Premis dengan kontrak yang sama tidak boleh dipakai lebih dari satu Sales Order.
        if (!empty($data['contract_premise_id'])
            && SalesOrder::where('contract_premise_id', $data['contract_premise_id'])->exists()) {
            return back()->withErrors([
                'contract_premise_id' => 'Premis ini sudah digunakan pada Sales Order lain dan tidak dapat dipilih lagi.',
            ])->withInput();
        }

        if (empty($data['customer_id']) && !empty($data['contract_id'])) {
            $data['customer_id'] = Contract::find($data['contract_id'])?->customer_id;
        }

        if (empty($data['so_number'])) {
            $data['so_number'] = $this->generateNextNumber();
        }

        $taxType = Setting::get('tax_type', 'exclude');

        DB::transaction(function () use ($data, $taxType) {
            [$totalAmount, $taxAmount, $itemTax] = $this->computeTotals($data['items'], $taxType);

            $so = SalesOrder::create(array_merge(
                collect($data)->except(['items', 'visit_plans'])->toArray(),
                ['total_amount' => $totalAmount, 'tax_amount' => $taxAmount]
            ));

            $this->saveItems($so, $data['items'], $itemTax);
            $this->saveVisitPlans($so, $data['visit_plans'] ?? []);
        });

        return redirect('/sales-orders')->with('success', 'Sales Order berhasil dibuat.');
    }

    public function edit(SalesOrder $salesOrder)
    {
        $salesOrder->load(['items', 'visitPlans', 'workOrders']);

        // Daftar Work Order (status + tanggal visit). Bulan & nomor visit dihitung
        // di frontend dari kontrak + visit plan, konsisten dengan form Work Order.
        $workOrders = $salesOrder->workOrders->map(fn($wo) => [
            'id'         => $wo->id,
            'status'     => $wo->status,
            'month'      => $wo->month,
            'visit_date' => optional($wo->visit_date)->format('Y-m-d'),
        ])->values();

        // Pemakaian qty sub-produk pada Work Order untuk SO ini, dikelompokkan per
        // (parent_product_id, product_id, month) → ditampilkan pada kolom "Qty WO".
        $woUsage = WorkOrderMaterial::query()
            ->whereHas('workOrder', fn($q) => $q->where('sales_order_id', $salesOrder->id))
            ->whereNotNull('parent_product_id')
            ->selectRaw('parent_product_id, product_id, month, SUM(quantity_used) as qty')
            ->groupBy('parent_product_id', 'product_id', 'month')
            ->get()
            ->mapWithKeys(fn($r) => [
                $r->parent_product_id . '-' . $r->product_id . '-' . (int) ($r->month ?? 1) => (float) $r->qty,
            ]);

        return Inertia::render('SalesOrders/Form', [
            'salesOrder'      => $salesOrder,
            'workOrders'      => $workOrders,
            'woUsage'         => $woUsage,
            'contracts'  => Contract::with([
                    'customer',
                    'premises.services.product',
                    'premises.services.uom',
                    'premises.services.subProducts.product',
                    'premises.services.subProducts.uom',
                ])
                // Sertakan kontrak SO ini walau tidak lagi aktif, agar data periode/premis tetap termuat.
                ->where(fn($q) => $q->where('status', 'active')->orWhere('id', $salesOrder->contract_id))
                ->orderBy('contract_number')
                ->get(),
            'products'   => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'unit', 'price', 'sales_price', 'product_type']),
            'uoms'       => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
            'taxType'    => Setting::get('tax_type', 'exclude'),
            'taxRateSo'  => (float) Setting::get('tax_rate_so', 11),
            // Settlement Amount: total paid_amount invoice (sudah dibayar via payment Verified)
            // yang cocok dengan kontrak DAN No SO ini — bukan akumulasi seluruh SO pada kontrak.
            'settlementAmount' => (float) Invoice::where('contract_id', $salesOrder->contract_id)
                ->where('sales_order_id', $salesOrder->id)
                ->sum('paid_amount'),
        ]);
    }

    public function update(Request $request, SalesOrder $salesOrder)
    {
        $data = $this->validateData($request, $salesOrder);

        $salesOrder->loadMissing('workOrders');

        // Req 2a: SO yang sudah dipakai Work Order tidak boleh dikembalikan ke Draft.
        if ($data['status'] === 'draft' && $salesOrder->workOrders->isNotEmpty()) {
            return back()->withErrors([
                'status' => 'SO sudah digunakan oleh Work Order, status tidak dapat dikembalikan ke Draft.',
            ])->withInput();
        }

        // Req 2b: status Completed hanya boleh bila tiap bulan punya Work Order Completed.
        if ($data['status'] === 'completed') {
            $contract = $salesOrder->contract_id ? Contract::find($salesOrder->contract_id) : null;
            if ($contract && $contract->start_date) {
                $duration = (int) ($contract->duration_months ?: 1);
                $completedMonths = $salesOrder->workOrders
                    ->where('status', 'completed')
                    ->filter(fn($wo) => $wo->visit_date)
                    ->map(fn($wo) => $this->contractMonthOf($contract->start_date, $wo->visit_date, $duration))
                    ->unique();

                $missing = collect($data['items'])
                    ->map(fn($it) => (int) ($it['month'] ?? 1))
                    ->unique()
                    ->reject(fn($m) => $completedMonths->contains($m));

                if ($missing->isNotEmpty()) {
                    return back()->withErrors([
                        'status' => 'Status Completed tidak dapat dipilih: belum semua bulan memiliki Work Order berstatus Completed.',
                    ])->withInput();
                }
            }
        }

        if (empty($data['customer_id']) && !empty($data['contract_id'])) {
            $data['customer_id'] = Contract::find($data['contract_id'])?->customer_id;
        }

        $taxType = Setting::get('tax_type', 'exclude');

        DB::transaction(function () use ($data, $salesOrder, $taxType) {
            [$totalAmount, $taxAmount, $itemTax] = $this->computeTotals($data['items'], $taxType);

            $salesOrder->update(array_merge(
                collect($data)->except(['items', 'visit_plans'])->toArray(),
                ['total_amount' => $totalAmount, 'tax_amount' => $taxAmount]
            ));

            // Hard delete agar tidak menyisakan baris soft-deleted (referensi WO
            // di sales_order_item_id otomatis di-null-kan oleh FK nullOnDelete).
            $salesOrder->items()->forceDelete();
            $this->saveItems($salesOrder, $data['items'], $itemTax);

            $salesOrder->visitPlans()->forceDelete();
            $this->saveVisitPlans($salesOrder, $data['visit_plans'] ?? []);
        });

        return redirect('/sales-orders')->with('success', 'Sales Order berhasil diperbarui.');
    }

    public function destroy(SalesOrder $salesOrder)
    {
        if ($salesOrder->status === 'completed') {
            return redirect('/sales-orders')->with('error', 'Sales Order dengan status Completed tidak bisa dihapus.');
        }

        $salesOrder->delete();

        return redirect('/sales-orders')->with('success', 'Sales Order berhasil dihapus.');
    }

    /**
     * Petakan sebuah tanggal ke nomor bulan kontrak (bulan 1 = bulan start_date),
     * dibatasi pada rentang 1..duration. Sejalan dengan logika di frontend.
     */
    private function contractMonthOf($start, $date, int $duration): int
    {
        $s = \Illuminate\Support\Carbon::parse($start);
        $d = \Illuminate\Support\Carbon::parse($date);
        $diff = ($d->year - $s->year) * 12 + ($d->month - $s->month) + 1;
        $max  = $duration > 0 ? $duration : 1;
        return max(1, min($max, $diff));
    }

    private function validateData(Request $request, ?SalesOrder $salesOrder = null): array
    {
        return $request->validate([
            'so_number'                => 'required|string|max:50',
            'contract_id'              => 'nullable|uuid|exists:contracts,id',
            'contract_premise_id'      => 'nullable|uuid|exists:contract_premises,id',
            'customer_id'              => 'nullable|uuid|exists:customers,id',
            'order_date'               => 'required|date',
            'status'                   => 'required|in:draft,confirmed,completed,cancelled',
            'notes'                    => 'nullable|string',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'        => 'required|uuid|exists:products,id',
            'items.*.parent_product_id' => 'nullable|uuid|exists:products,id',
            'items.*.month'             => 'nullable|integer|min:1',
            'items.*.quantity'         => 'required|numeric|min:0',
            'items.*.uom'              => 'nullable|string|max:50',
            'items.*.uom_id'           => 'nullable|uuid|exists:unit_of_measures,id',
            'items.*.uom_conversion'   => 'nullable|numeric|min:0',
            'items.*.unit_price'       => 'required|numeric|min:0',
            'items.*.tax_rate'         => 'nullable|numeric|min:0|max:100',
            'visit_plans'                  => 'nullable|array',
            'visit_plans.*.visit_number'   => 'required|integer|min:1',
            'visit_plans.*.visit_date'     => 'nullable|date',
            'visit_plans.*.quantity'       => 'nullable|numeric|min:0',
        ]);
    }

    /**
     * @return array{0: float, 1: float, 2: \Closure}
     */
    private function computeTotals(array $items, string $taxType): array
    {
        $itemTax = function (float $sub, float $rate) use ($taxType): float {
            if ($rate <= 0) return 0.0;
            return $taxType === 'exclude'
                ? $sub * $rate / 100
                : $sub * $rate / (100 + $rate);
        };

        $collection = collect($items);
        $subtotal   = $collection->sum(fn($it) => $it['quantity'] * $it['unit_price']);
        $taxAmount  = $collection->sum(fn($it) => $itemTax(
            $it['quantity'] * $it['unit_price'],
            (float) ($it['tax_rate'] ?? 0)
        ));
        // exclude: total = subtotal + tax | include: total = subtotal (tax embedded)
        $totalAmount = $taxType === 'exclude' ? $subtotal + $taxAmount : $subtotal;

        return [$totalAmount, $taxAmount, $itemTax];
    }

    private function saveItems(SalesOrder $so, array $items, \Closure $itemTax): void
    {
        foreach ($items as $item) {
            $sub = $item['quantity'] * $item['unit_price'];
            $so->items()->create([
                'product_id'        => $item['product_id'],
                'parent_product_id' => $item['parent_product_id'] ?? null,
                'month'             => $item['month']          ?? 1,
                'quantity'       => $item['quantity'],
                'uom'            => $item['uom']            ?? null,
                'uom_id'         => $item['uom_id']          ?? null,
                'uom_conversion' => $item['uom_conversion'] ?? 1,
                'unit_price'     => $item['unit_price'],
                'tax_rate'       => $item['tax_rate']       ?? 0,
                'tax_amount'     => $itemTax($sub, (float) ($item['tax_rate'] ?? 0)),
                'subtotal'       => $sub,
            ]);
        }
    }

    private function saveVisitPlans(SalesOrder $so, array $plans): void
    {
        $start = $so->contract?->start_date;

        foreach ($plans as $plan) {
            $date = $plan['visit_date'] ?? null;

            // Tanggal visit yang dikosongkan otomatis diisi tanggal 1 pada bulan ke-N
            // (visit_number), dihitung dari bulan mulai kontrak.
            if (empty($date) && $start) {
                $date = \Illuminate\Support\Carbon::parse($start)
                    ->startOfMonth()
                    ->addMonths(max(0, (int) $plan['visit_number'] - 1))
                    ->toDateString();
            }

            $so->visitPlans()->create([
                'visit_number' => $plan['visit_number'],
                'visit_date'   => $date,
                'quantity'     => $plan['quantity'] ?? null,
            ]);
        }
    }
}

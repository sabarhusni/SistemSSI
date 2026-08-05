<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Contract;
use App\Models\Product;
use App\Models\Setting;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['invoice_number', 'invoice_date', 'due_date', 'total_amount', 'paid_amount', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Invoice::with(['customer', 'contract', 'workOrders'])
            ->when($request->search, fn($q, $s) => $q->where('invoice_number', 'ilike', "%$s%")
                ->orWhereHas('customer', fn($cq) => $cq->where('name', 'ilike', "%$s%")))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->contract_id, fn($q, $v) => $q->where('contract_id', $v))
            ->when($request->work_order_id, fn($q, $v) => $q->whereHas('workOrders', fn($sq) => $sq->where('work_orders.id', $v)))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Invoices/Index', [
            'invoices'   => $query->paginate(15)->withQueryString(),
            'filters'    => $request->only('search', 'status', 'contract_id', 'work_order_id', 'sort_by', 'sort_dir'),
            'contracts'  => Contract::whereHas('invoices')->orderBy('contract_number')->get(['id', 'contract_number']),
            'workOrders' => WorkOrder::whereHas('invoices')->orderBy('wo_number')->get(['id', 'wo_number']),
        ]);
    }

    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'INV' . $year;
        $last   = Invoice::where('invoice_number', 'like', $prefix . '%')
            ->orderBy('invoice_number', 'desc')
            ->value('invoice_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Hanya SO berstatus confirmed yang memiliki minimal satu Work Order Completed
     * yang layak ditagih. Closure dipakai ulang pada filter kontrak & eager-load SO.
     */
    private function invoiceableWoQuery(): \Closure
    {
        return fn($q) => $q->where('status', 'confirmed')
            ->whereHas('workOrders', fn($w) => $w->where('status', 'completed'));
    }

    /**
     * Resolve work_order_id → sales_order_id untuk item yang disubmit (satu query),
     * dipakai validasi duplikat & WO aktif yang tetap dikelompokkan per SO+bulan
     * (WorkOrderMaterial tidak menyimpan harga, jadi SO tetap jadi acuan produk/harga).
     */
    private function soIdsByWorkOrder(array $items): array
    {
        $woIds = collect($items)->pluck('work_order_id')->filter()->unique()->values();
        if ($woIds->isEmpty()) {
            return [];
        }
        return WorkOrder::whereIn('id', $woIds)->pluck('sales_order_id', 'id')->toArray();
    }

    /**
     * Peta produk SO per bulan yang sudah pernah ditagih (status draft/sent/paid),
     * dikelompokkan per sales_order_id (diresolve lewat relasi workOrder milik tiap
     * invoice item, karena item kini menyimpan work_order_id, bukan sales_order_id
     * langsung): ['so-id' => ['product-id|month', ...]].
     * Dipakai form invoice untuk menyembunyikan item SO-bulan yang sudah ditagih.
     * Invoice yang sedang diedit dikecualikan agar itemnya sendiri tetap dapat dimuat ulang.
     */
    private function invoicedKeysBySo(?string $exceptInvoiceId = null): array
    {
        return InvoiceItem::whereHas('invoice', fn($q) => $q->whereIn('status', ['draft', 'sent', 'paid'])
                ->when($exceptInvoiceId, fn($q2) => $q2->where('id', '!=', $exceptInvoiceId)))
            ->whereNotNull('work_order_id')
            ->with('workOrder:id,sales_order_id')
            ->get(['id', 'work_order_id', 'product_id', 'month'])
            ->filter(fn($it) => $it->workOrder)
            ->groupBy(fn($it) => $it->workOrder->sales_order_id)
            ->map(fn($items) => $items
                ->map(fn($it) => $it->product_id . '|' . (int) ($it->month ?? 1))
                ->unique()->values()->all())
            ->toArray();
    }

    /**
     * Tolak bila ada item (produk SO per bulan) yang sudah pernah ditagih pada invoice
     * lain dengan SO yang sama (status draft/sent/paid). Dicek per sales_order_id hasil
     * resolve dari work_order_id masing-masing item yang disubmit — item tanpa
     * work_order_id (baris ringkasan kontrak pest hama unik) dilewati karena tidak
     * terikat produk/bulan SO tertentu. Invoice yang sedang diedit dikecualikan.
     * Mengembalikan pesan error, atau null bila tidak ada duplikat.
     */
    private function duplicateInvoicedError(array $items, ?string $exceptInvoiceId = null): ?string
    {
        $invoicedBySo = $this->invoicedKeysBySo($exceptInvoiceId);
        $soIdByWo     = $this->soIdsByWorkOrder($items);
        $dupMonths    = collect();

        $bySo = collect($items)
            ->filter(fn($it) => !empty($it['work_order_id']) && isset($soIdByWo[$it['work_order_id']]))
            ->groupBy(fn($it) => $soIdByWo[$it['work_order_id']]);

        foreach ($bySo as $soId => $soItems) {
            $invoicedSet = array_flip($invoicedBySo[$soId] ?? []);
            if (empty($invoicedSet)) {
                continue;
            }
            $dupMonths = $dupMonths->merge(
                $soItems->filter(fn($it) => isset($invoicedSet[($it['product_id'] ?? '') . '|' . (int) ($it['month'] ?? 1)]))
                    ->pluck('month')->map(fn($m) => (int) ($m ?? 1))
            );
        }

        $dupMonths = $dupMonths->unique()->sort()->values();
        if ($dupMonths->isEmpty()) {
            return null;
        }

        return 'Invoice tidak dapat diproses: produk service untuk bulan '
            . $dupMonths->join(', ') . ' pada SO terkait sudah pernah ditagih di invoice lain.';
    }

    public function create()
    {
        $invoiceableWo = $this->invoiceableWoQuery();

        return Inertia::render('Invoices/Form', [
            'contracts'  => Contract::whereHas('salesOrders', $invoiceableWo)
                ->with([
                    'customer',
                    'salesOrders' => fn($q) => $invoiceableWo($q)->orderBy('so_number')
                        ->with([
                            'items.product',
                            'premise',
                            'workOrders' => fn($w) => $w->where('status', 'completed')->orderBy('wo_number'),
                        ]),
                ])
                ->whereIn('status', ['active', 'completed'])
                ->orderBy('contract_number')->get(),
            'products'   => Product::where('status', 'active')->orderBy('name')
                ->get(['id', 'code', 'name', 'unit', 'sales_price']),
            'nextNumber'    => $this->generateNextNumber(),
            'invoicedKeys'  => $this->invoicedKeysBySo(),
            'taxType'       => Setting::get('tax_type', 'exclude'),
            'invoicedTotalsByContract' => $this->invoicedTotalsByContract(),
        ]);
    }

    /**
     * Invoice tidak boleh diproses bila produk service per bulan yang ditagih
     * masih punya Work Order aktif (Pending/In Progress) pada SO yang sama.
     * Dicek per sales_order_id hasil resolve dari work_order_id masing-masing item
     * yang disubmit — item tanpa work_order_id (baris ringkasan kontrak pest hama
     * unik) dilewati. Mengembalikan pesan error bila ada WO aktif, atau null bila
     * layak ditagih.
     */
    private function activeWorkOrderError(array $items): ?string
    {
        $soIdByWo = $this->soIdsByWorkOrder($items);
        $active   = collect();

        $bySo = collect($items)
            ->filter(fn($it) => !empty($it['work_order_id']) && isset($soIdByWo[$it['work_order_id']]))
            ->groupBy(fn($it) => $soIdByWo[$it['work_order_id']]);

        foreach ($bySo as $soId => $soItems) {
            $months = $soItems->pluck('month')->map(fn($m) => (int) ($m ?? 1))->all();
            $active = $active->merge(WorkOrder::activeForSalesOrderMonths($soId, $months));
        }

        if ($active->isEmpty()) {
            return null;
        }

        return 'Invoice tidak dapat diproses: masih ada Work Order aktif ('
            . $active->pluck('wo_number')->unique()->join(', ')
            . ') untuk bulan layanan yang ditagih. Selesaikan Work Order tersebut terlebih dahulu.';
    }

    /**
     * Total invoice (draft/sent/paid) per kontrak, dipakai form invoice untuk
     * menghitung default "Nilai Tagihan" (sisa belum ditagih) pada kontrak pest
     * hama unik. Invoice yang sedang diedit dikecualikan.
     */
    private function invoicedTotalsByContract(?string $exceptInvoiceId = null): array
    {
        return Invoice::whereIn('status', ['draft', 'sent', 'paid'])
            ->whereNotNull('contract_id')
            ->when($exceptInvoiceId, fn($q) => $q->where('id', '!=', $exceptInvoiceId))
            ->selectRaw('contract_id, SUM(total_amount) as total')
            ->groupBy('contract_id')
            ->pluck('total', 'contract_id')
            ->toArray();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'contract_id'        => 'nullable|uuid|exists:contracts,id',
            'customer_id'        => 'nullable|uuid|exists:customers,id',
            'work_order_ids'     => 'nullable|array',
            'work_order_ids.*'   => 'uuid|exists:work_orders,id',
            'invoice_number' => ['required', 'string', 'max:50', Rule::unique('invoices', 'invoice_number')->whereNull('deleted_at')],
            'invoice_date'   => 'required|date',
            'due_date'       => 'required|date|after_or_equal:invoice_date',
            'status'         => 'required|in:draft,sent,paid,cancelled',
            'notes'          => 'nullable|string',
            'items'                     => 'required|array|min:1',
            'items.*.product_id'        => 'nullable|uuid|exists:products,id',
            'items.*.description'       => 'nullable|string|max:255',
            'items.*.month'             => 'nullable|integer|min:1',
            'items.*.work_order_id'     => 'nullable|uuid|exists:work_orders,id',
            'items.*.premise_location'  => 'nullable|string|max:255',
            'items.*.premise_address'   => 'nullable|string|max:255',
            'items.*.quantity'       => 'required|numeric|min:0',
            'items.*.uom'            => 'nullable|string|max:50',
            'items.*.uom_conversion' => 'nullable|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.tax_rate'       => 'nullable|numeric|min:0|max:100',
        ]);

        if (empty($data['invoice_number'])) {
            $data['invoice_number'] = $this->generateNextNumber();
        }

        if ($error = $this->activeWorkOrderError($data['items'])) {
            return back()->withErrors(['items' => $error])->withInput();
        }

        if ($error = $this->duplicateInvoicedError($data['items'])) {
            return back()->withErrors(['items' => $error])->withInput();
        }

        // Derive customer_id from contract if not sent
        if (empty($data['customer_id']) && !empty($data['contract_id'])) {
            $data['customer_id'] = Contract::find($data['contract_id'])?->customer_id;
        }

        $taxType = Setting::get('tax_type', 'exclude');

        DB::transaction(function () use ($data, $taxType) {
            [$subtotal, $tax, $total, $itemTax] = $this->computeTotals($data['items'], $taxType);

            $invoice = Invoice::create(array_merge(
                collect($data)->except(['items', 'work_order_ids'])->toArray(),
                ['subtotal' => $subtotal, 'tax' => $tax, 'total_amount' => $total]
            ));

            $soByWo = WorkOrder::whereIn('id', $data['work_order_ids'] ?? [])->pluck('sales_order_id', 'id');
            $invoice->workOrders()->sync(
                collect($data['work_order_ids'] ?? [])
                    ->mapWithKeys(fn($id) => [$id => ['sales_order_id' => $soByWo[$id] ?? null]])
                    ->all()
            );

            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $taxAmt = $itemTax($sub, (float) ($item['tax_rate'] ?? 0));
                $invoice->items()->create([
                    'product_id'       => $item['product_id']       ?? null,
                    'description'      => $item['description']      ?? null,
                    'month'            => $item['month']            ?? 1,
                    'work_order_id'    => $item['work_order_id']    ?? null,
                    'premise_location' => $item['premise_location'] ?? null,
                    'premise_address'  => $item['premise_address']  ?? null,
                    'quantity'       => $item['quantity'],
                    'uom'            => $item['uom']            ?? null,
                    'uom_conversion' => $item['uom_conversion'] ?? 1,
                    'unit_price'     => $item['unit_price'],
                    'tax_rate'       => $item['tax_rate']       ?? 0,
                    'tax_amount'     => $taxAmt,
                    'subtotal'       => $sub,
                ]);
            }
        });

        return redirect('/invoices')->with('success', 'Invoice berhasil dibuat.');
    }

    public function edit(Invoice $invoice)
    {
        $invoiceableWo = $this->invoiceableWoQuery();

        return Inertia::render('Invoices/Form', [
            'invoice'   => $invoice->load('items.product', 'workOrders'),
            // Sertakan kontrak yang punya SO layak tagih, atau kontrak invoice ini sendiri.
            'contracts' => Contract::where(fn($q) => $q->whereHas('salesOrders', $invoiceableWo)
                    ->orWhere('id', $invoice->contract_id))
                ->with([
                    'customer',
                    'salesOrders' => fn($q) => $q->orderBy('so_number')->with([
                        'items.product',
                        'premise',
                        'workOrders' => fn($w) => $w->where('status', 'completed')->orderBy('wo_number'),
                    ]),
                ])
                ->orderBy('contract_number')->get(),
            'products'  => Product::where('status', 'active')->orderBy('name')
                ->get(['id', 'code', 'name', 'unit', 'sales_price']),
            'invoicedKeys' => $this->invoicedKeysBySo($invoice->id),
            'taxType'      => Setting::get('tax_type', 'exclude'),
            'invoicedTotalsByContract' => $this->invoicedTotalsByContract($invoice->id),
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        // Invoice yang sudah lunas (paid) hanya bisa dilihat, tidak dapat diubah.
        if ($invoice->status === 'paid') {
            return redirect('/invoices')->with('error', 'Invoice yang sudah Paid tidak dapat diubah.');
        }

        $data = $request->validate([
            'contract_id'        => 'nullable|uuid|exists:contracts,id',
            'customer_id'        => 'nullable|uuid|exists:customers,id',
            'work_order_ids'     => 'nullable|array',
            'work_order_ids.*'   => 'uuid|exists:work_orders,id',
            'invoice_number' => ['required', 'string', 'max:50', Rule::unique('invoices', 'invoice_number')->ignore($invoice->id)->whereNull('deleted_at')],
            'invoice_date'   => 'required|date',
            'due_date'       => 'required|date|after_or_equal:invoice_date',
            'status'         => 'required|in:draft,sent,paid,cancelled',
            'notes'          => 'nullable|string',
            'items'                     => 'required|array|min:1',
            'items.*.product_id'        => 'nullable|uuid|exists:products,id',
            'items.*.description'       => 'nullable|string|max:255',
            'items.*.month'             => 'nullable|integer|min:1',
            'items.*.work_order_id'     => 'nullable|uuid|exists:work_orders,id',
            'items.*.premise_location'  => 'nullable|string|max:255',
            'items.*.premise_address'   => 'nullable|string|max:255',
            'items.*.quantity'       => 'required|numeric|min:0',
            'items.*.uom'            => 'nullable|string|max:50',
            'items.*.uom_conversion' => 'nullable|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.tax_rate'       => 'nullable|numeric|min:0|max:100',
        ]);

        if ($error = $this->activeWorkOrderError($data['items'])) {
            return back()->withErrors(['items' => $error])->withInput();
        }

        if ($error = $this->duplicateInvoicedError($data['items'], $invoice->id)) {
            return back()->withErrors(['items' => $error])->withInput();
        }

        if (empty($data['customer_id']) && !empty($data['contract_id'])) {
            $data['customer_id'] = Contract::find($data['contract_id'])?->customer_id;
        }

        $taxType = Setting::get('tax_type', 'exclude');

        DB::transaction(function () use ($data, $invoice, $taxType) {
            [$subtotal, $tax, $total, $itemTax] = $this->computeTotals($data['items'], $taxType);

            $invoice->update(array_merge(
                collect($data)->except(['items', 'work_order_ids'])->toArray(),
                ['subtotal' => $subtotal, 'tax' => $tax, 'total_amount' => $total]
            ));

            $soByWo = WorkOrder::whereIn('id', $data['work_order_ids'] ?? [])->pluck('sales_order_id', 'id');
            $invoice->workOrders()->sync(
                collect($data['work_order_ids'] ?? [])
                    ->mapWithKeys(fn($id) => [$id => ['sales_order_id' => $soByWo[$id] ?? null]])
                    ->all()
            );

            $invoice->items()->forceDelete();
            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $taxAmt = $itemTax($sub, (float) ($item['tax_rate'] ?? 0));
                $invoice->items()->create([
                    'product_id'       => $item['product_id']       ?? null,
                    'description'      => $item['description']      ?? null,
                    'month'            => $item['month']            ?? 1,
                    'work_order_id'    => $item['work_order_id']    ?? null,
                    'premise_location' => $item['premise_location'] ?? null,
                    'premise_address'  => $item['premise_address']  ?? null,
                    'quantity'       => $item['quantity'],
                    'uom'            => $item['uom']            ?? null,
                    'uom_conversion' => $item['uom_conversion'] ?? 1,
                    'unit_price'     => $item['unit_price'],
                    'tax_rate'       => $item['tax_rate']       ?? 0,
                    'tax_amount'     => $taxAmt,
                    'subtotal'       => $sub,
                ]);
            }
        });

        return redirect('/invoices')->with('success', 'Invoice berhasil diperbarui.');
    }

    public function destroy(Invoice $invoice)
    {
        // Invoice yang sudah lunas (paid) tidak dapat dihapus.
        if ($invoice->status === 'paid') {
            return redirect('/invoices')->with('error', 'Invoice yang sudah Paid tidak dapat dihapus.');
        }

        $invoice->delete();
        return redirect('/invoices')->with('success', 'Invoice berhasil dihapus.');
    }

    /**
     * Hitung subtotal, tax, dan total invoice sesuai setting tax_type (exclude/include),
     * sejalan dengan pola computeTotals() pada SalesOrderController & PurchaseOrderController.
     * @return array{0: float, 1: float, 2: float, 3: \Closure}
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

        return [$subtotal, $taxAmount, $totalAmount, $itemTax];
    }

    public function print(Invoice $invoice)
    {
        $invoice->load([
            'customer',
            'contract',
            'workOrders:id,wo_number',
            'items.product',
        ]);

        return Inertia::render('Invoices/Print', [
            'invoice'     => $invoice,
            'companyName' => Setting::get('company_name', ''),
        ]);
    }
}

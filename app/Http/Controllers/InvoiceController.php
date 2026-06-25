<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Contract;
use App\Models\Product;
use App\Models\SalesOrder;
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

        $query = Invoice::with(['customer', 'contract', 'salesOrder'])
            ->when($request->search, fn($q, $s) => $q->where('invoice_number', 'ilike', "%$s%")
                ->orWhereHas('customer', fn($cq) => $cq->where('name', 'ilike', "%$s%")))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->contract_id, fn($q, $v) => $q->where('contract_id', $v))
            ->when($request->sales_order_id, fn($q, $v) => $q->where('sales_order_id', $v))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Invoices/Index', [
            'invoices'    => $query->paginate(15)->withQueryString(),
            'filters'     => $request->only('search', 'status', 'contract_id', 'sales_order_id', 'sort_by', 'sort_dir'),
            'contracts'   => Contract::whereHas('invoices')->orderBy('contract_number')->get(['id', 'contract_number']),
            'salesOrders' => SalesOrder::whereHas('invoices')->orderBy('so_number')->get(['id', 'so_number']),
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
    private function invoiceableSoQuery(): \Closure
    {
        return fn($q) => $q->where('status', 'confirmed')
            ->whereHas('workOrders', fn($w) => $w->where('status', 'completed'));
    }

    /**
     * Peta produk SO per bulan yang sudah pernah ditagih (status draft/sent/paid),
     * dikelompokkan per sales_order_id: ['so-id' => ['product-id|month', ...]].
     * Dipakai form invoice untuk menyembunyikan item SO-bulan yang sudah ditagih.
     * Invoice yang sedang diedit dikecualikan agar itemnya sendiri tetap dapat dimuat ulang.
     */
    private function invoicedKeysBySo(?string $exceptInvoiceId = null): array
    {
        return Invoice::whereIn('status', ['draft', 'sent', 'paid'])
            ->whereNotNull('sales_order_id')
            ->when($exceptInvoiceId, fn($q) => $q->where('id', '!=', $exceptInvoiceId))
            ->with('items:id,invoice_id,product_id,month')
            ->get(['id', 'sales_order_id'])
            ->groupBy('sales_order_id')
            ->map(fn($invs) => $invs->flatMap(fn($inv) => $inv->items)
                ->map(fn($it) => $it->product_id . '|' . (int) ($it->month ?? 1))
                ->unique()->values()->all())
            ->toArray();
    }

    /**
     * Tolak bila ada item (produk SO per bulan) yang sudah pernah ditagih pada invoice
     * lain dengan No SO yang sama (status draft/sent/paid). Invoice yang sedang diedit
     * dikecualikan. Mengembalikan pesan error, atau null bila tidak ada duplikat.
     */
    private function duplicateInvoicedError(?string $salesOrderId, array $items, ?string $exceptInvoiceId = null): ?string
    {
        if (empty($salesOrderId)) {
            return null;
        }

        $invoiced = $this->invoicedKeysBySo($exceptInvoiceId)[$salesOrderId] ?? [];
        if (empty($invoiced)) {
            return null;
        }

        $invoicedSet = array_flip($invoiced);
        $dupMonths   = collect($items)
            ->filter(fn($it) => isset($invoicedSet[($it['product_id'] ?? '') . '|' . (int) ($it['month'] ?? 1)]))
            ->pluck('month')->map(fn($m) => (int) ($m ?? 1))->unique()->sort()->values();

        if ($dupMonths->isEmpty()) {
            return null;
        }

        return 'Invoice tidak dapat diproses: produk service untuk bulan '
            . $dupMonths->join(', ') . ' pada SO ini sudah pernah ditagih di invoice lain.';
    }

    public function create()
    {
        $invoiceableSo = $this->invoiceableSoQuery();

        return Inertia::render('Invoices/Form', [
            'contracts'  => Contract::whereHas('salesOrders', $invoiceableSo)
                ->with([
                    'customer',
                    'salesOrders' => fn($q) => $invoiceableSo($q)->orderBy('so_number')
                        ->with([
                            'items.product',
                            'premise',
                            'workOrders' => fn($w) => $w->where('status', 'completed')->with('materials:id,work_order_id,month'),
                        ]),
                ])
                ->whereIn('status', ['active', 'completed'])
                ->orderBy('contract_number')->get(),
            'products'   => Product::where('status', 'active')->orderBy('name')
                ->get(['id', 'code', 'name', 'unit', 'sales_price']),
            'nextNumber'    => $this->generateNextNumber(),
            'invoicedKeys'  => $this->invoicedKeysBySo(),
        ]);
    }

    /**
     * Invoice tidak boleh diproses bila produk service per bulan yang ditagih
     * masih punya Work Order aktif (Pending/In Progress) pada SO yang sama.
     * Mengembalikan pesan error bila ada WO aktif, atau null bila layak ditagih.
     */
    private function activeWorkOrderError(?string $salesOrderId, array $items): ?string
    {
        $months    = collect($items)->pluck('month')->map(fn($m) => (int) ($m ?? 1))->all();
        $activeWos = WorkOrder::activeForSalesOrderMonths($salesOrderId, $months);

        if ($activeWos->isEmpty()) {
            return null;
        }

        return 'Invoice tidak dapat diproses: masih ada Work Order aktif ('
            . $activeWos->pluck('wo_number')->join(', ')
            . ') untuk bulan layanan yang ditagih. Selesaikan Work Order tersebut terlebih dahulu.';
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'contract_id'    => 'nullable|uuid|exists:contracts,id',
            'customer_id'    => 'nullable|uuid|exists:customers,id',
            'sales_order_id' => 'nullable|uuid|exists:sales_orders,id',
            'invoice_number' => ['required', 'string', 'max:50', Rule::unique('invoices', 'invoice_number')->whereNull('deleted_at')],
            'invoice_date'   => 'required|date',
            'due_date'       => 'required|date|after_or_equal:invoice_date',
            'status'         => 'required|in:draft,sent,paid,cancelled',
            'notes'          => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'nullable|uuid|exists:products,id',
            'items.*.description'    => 'nullable|string|max:255',
            'items.*.month'          => 'nullable|integer|min:1',
            'items.*.quantity'       => 'required|numeric|min:0',
            'items.*.uom'            => 'nullable|string|max:50',
            'items.*.uom_conversion' => 'nullable|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.tax_rate'       => 'nullable|numeric|min:0|max:100',
        ]);

        if (empty($data['invoice_number'])) {
            $data['invoice_number'] = $this->generateNextNumber();
        }

        if ($error = $this->activeWorkOrderError($data['sales_order_id'] ?? null, $data['items'])) {
            return back()->withErrors(['items' => $error])->withInput();
        }

        if ($error = $this->duplicateInvoicedError($data['sales_order_id'] ?? null, $data['items'])) {
            return back()->withErrors(['items' => $error])->withInput();
        }

        // Derive customer_id from contract if not sent
        if (empty($data['customer_id']) && !empty($data['contract_id'])) {
            $data['customer_id'] = Contract::find($data['contract_id'])?->customer_id;
        }

        DB::transaction(function () use ($data) {
            $items      = collect($data['items']);
            $subtotal   = $items->sum(fn($it) => $it['quantity'] * $it['unit_price']);
            $tax        = $items->sum(fn($it) => $it['quantity'] * $it['unit_price'] * (($it['tax_rate'] ?? 0) / 100));
            $total      = $subtotal + $tax;

            $invoice = Invoice::create(array_merge(
                collect($data)->except('items')->toArray(),
                ['subtotal' => $subtotal, 'tax' => $tax, 'total_amount' => $total]
            ));

            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $taxAmt = $sub * (($item['tax_rate'] ?? 0) / 100);
                $invoice->items()->create([
                    'product_id'     => $item['product_id']     ?? null,
                    'description'    => $item['description']    ?? null,
                    'month'          => $item['month']          ?? 1,
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
        $invoiceableSo = $this->invoiceableSoQuery();

        return Inertia::render('Invoices/Form', [
            'invoice'   => $invoice->load('items.product'),
            // Sertakan kontrak yang punya SO layak tagih, atau kontrak invoice ini sendiri.
            'contracts' => Contract::where(fn($q) => $q->whereHas('salesOrders', $invoiceableSo)
                    ->orWhere('id', $invoice->contract_id))
                ->with([
                    'customer',
                    'salesOrders' => fn($q) => $q->orderBy('so_number')->with([
                        'items.product',
                        'premise',
                        'workOrders' => fn($w) => $w->where('status', 'completed')->with('materials.product'),
                    ]),
                ])
                ->orderBy('contract_number')->get(),
            'products'  => Product::where('status', 'active')->orderBy('name')
                ->get(['id', 'code', 'name', 'unit', 'sales_price']),
            'invoicedKeys' => $this->invoicedKeysBySo($invoice->id),
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        // Invoice yang sudah lunas (paid) hanya bisa dilihat, tidak dapat diubah.
        if ($invoice->status === 'paid') {
            return redirect('/invoices')->with('error', 'Invoice yang sudah Paid tidak dapat diubah.');
        }

        $data = $request->validate([
            'contract_id'    => 'nullable|uuid|exists:contracts,id',
            'customer_id'    => 'nullable|uuid|exists:customers,id',
            'sales_order_id' => 'nullable|uuid|exists:sales_orders,id',
            'invoice_number' => ['required', 'string', 'max:50', Rule::unique('invoices', 'invoice_number')->ignore($invoice->id)->whereNull('deleted_at')],
            'invoice_date'   => 'required|date',
            'due_date'       => 'required|date|after_or_equal:invoice_date',
            'status'         => 'required|in:draft,sent,paid,cancelled',
            'notes'          => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'nullable|uuid|exists:products,id',
            'items.*.description'    => 'nullable|string|max:255',
            'items.*.month'          => 'nullable|integer|min:1',
            'items.*.quantity'       => 'required|numeric|min:0',
            'items.*.uom'            => 'nullable|string|max:50',
            'items.*.uom_conversion' => 'nullable|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.tax_rate'       => 'nullable|numeric|min:0|max:100',
        ]);

        if ($error = $this->activeWorkOrderError($data['sales_order_id'] ?? null, $data['items'])) {
            return back()->withErrors(['items' => $error])->withInput();
        }

        if ($error = $this->duplicateInvoicedError($data['sales_order_id'] ?? null, $data['items'], $invoice->id)) {
            return back()->withErrors(['items' => $error])->withInput();
        }

        if (empty($data['customer_id']) && !empty($data['contract_id'])) {
            $data['customer_id'] = Contract::find($data['contract_id'])?->customer_id;
        }

        DB::transaction(function () use ($data, $invoice) {
            $items    = collect($data['items']);
            $subtotal = $items->sum(fn($it) => $it['quantity'] * $it['unit_price']);
            $tax      = $items->sum(fn($it) => $it['quantity'] * $it['unit_price'] * (($it['tax_rate'] ?? 0) / 100));
            $total    = $subtotal + $tax;

            $invoice->update(array_merge(
                collect($data)->except('items')->toArray(),
                ['subtotal' => $subtotal, 'tax' => $tax, 'total_amount' => $total]
            ));

            $invoice->items()->forceDelete();
            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $taxAmt = $sub * (($item['tax_rate'] ?? 0) / 100);
                $invoice->items()->create([
                    'product_id'     => $item['product_id']     ?? null,
                    'description'    => $item['description']    ?? null,
                    'month'          => $item['month']          ?? 1,
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

    public function print(Invoice $invoice)
    {
        $invoice->load([
            'customer',
            'contract',
            'salesOrder.premise',
            'items.product',
        ]);

        return Inertia::render('Invoices/Print', [
            'invoice'     => $invoice,
            'companyName' => Setting::get('company_name', ''),
        ]);
    }
}

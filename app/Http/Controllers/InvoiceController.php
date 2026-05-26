<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Contract;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Invoices/Index', [
            'invoices' => $query->paginate(15)->withQueryString(),
            'filters'  => $request->only('search', 'status', 'sort_by', 'sort_dir'),
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

    public function create()
    {
        return Inertia::render('Invoices/Form', [
            'contracts'  => Contract::with(['customer', 'salesOrders' => fn($q) => $q->with('items.product')->latest()])
                ->where('status', 'active')->orderBy('contract_number')->get(),
            'products'   => Product::where('status', 'active')->orderBy('name')
                ->get(['id', 'code', 'name', 'unit', 'sales_price']),
            'nextNumber' => $this->generateNextNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'contract_id'    => 'nullable|uuid|exists:contracts,id',
            'customer_id'    => 'nullable|uuid|exists:customers,id',
            'sales_order_id' => 'nullable|uuid|exists:sales_orders,id',
            'invoice_number' => 'required|string|max:50|unique:invoices,invoice_number',
            'invoice_date'   => 'required|date',
            'due_date'       => 'required|date|after_or_equal:invoice_date',
            'status'         => 'required|in:draft,sent,paid,cancelled',
            'notes'          => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'nullable|uuid|exists:products,id',
            'items.*.description'    => 'nullable|string|max:255',
            'items.*.quantity'       => 'required|numeric|min:0',
            'items.*.uom'            => 'nullable|string|max:50',
            'items.*.uom_conversion' => 'nullable|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.tax_rate'       => 'nullable|numeric|min:0|max:100',
        ]);

        if (empty($data['invoice_number'])) {
            $data['invoice_number'] = $this->generateNextNumber();
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
        return Inertia::render('Invoices/Form', [
            'invoice'   => $invoice->load('items.product'),
            'contracts' => Contract::with(['customer', 'salesOrders' => fn($q) => $q->with('items.product')->latest()])
                ->where('status', 'active')->orderBy('contract_number')->get(),
            'products'  => Product::where('status', 'active')->orderBy('name')
                ->get(['id', 'code', 'name', 'unit', 'sales_price']),
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'contract_id'    => 'nullable|uuid|exists:contracts,id',
            'customer_id'    => 'nullable|uuid|exists:customers,id',
            'sales_order_id' => 'nullable|uuid|exists:sales_orders,id',
            'invoice_number' => 'required|string|max:50|unique:invoices,invoice_number,' . $invoice->id,
            'invoice_date'   => 'required|date',
            'due_date'       => 'required|date|after_or_equal:invoice_date',
            'status'         => 'required|in:draft,sent,paid,cancelled',
            'notes'          => 'nullable|string',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'nullable|uuid|exists:products,id',
            'items.*.description'    => 'nullable|string|max:255',
            'items.*.quantity'       => 'required|numeric|min:0',
            'items.*.uom'            => 'nullable|string|max:50',
            'items.*.uom_conversion' => 'nullable|numeric|min:0',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.tax_rate'       => 'nullable|numeric|min:0|max:100',
        ]);

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

            $invoice->items()->delete();
            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $taxAmt = $sub * (($item['tax_rate'] ?? 0) / 100);
                $invoice->items()->create([
                    'product_id'     => $item['product_id']     ?? null,
                    'description'    => $item['description']    ?? null,
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
        $invoice->delete();
        return redirect('/invoices')->with('success', 'Invoice berhasil dihapus.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\SalesOrder;
use App\Models\PurchaseOrder;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\CashTransaction;
use App\Models\BankTransaction;
use App\Models\BankAccount;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\User;
use App\Models\WorkOrderMaterial;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    /* ── Sales ── */
    public function sales(Request $request)
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();

        $query = SalesOrder::with(['customer', 'salesPerson', 'items.product'])
            ->whereBetween('order_date', [$from, $to])
            ->when($request->customer_id,     fn($q, $v) => $q->where('customer_id', $v))
            ->when($request->status,          fn($q, $v) => $q->where('status', $v))
            ->when($request->sales_person_id, fn($q, $v) => $q->where('sales_person_id', $v))
            ->orderBy('order_date');

        $orders = $query->get();

        $summary = [
            'total_orders'  => $orders->count(),
            'total_revenue' => $orders->sum('total_amount'),
            'by_status'     => $orders->groupBy('status')->map->count(),
        ];

        return Inertia::render('Reports/Sales', [
            'orders'    => $orders,
            'summary'   => $summary,
            'customers' => Customer::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'users'     => User::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'filters'   => $request->only('from', 'to', 'customer_id', 'status', 'sales_person_id'),
        ]);
    }

    /* ── Purchase ── */
    public function purchase(Request $request)
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();

        $query = PurchaseOrder::with(['supplier', 'items.product'])
            ->whereBetween('po_date', [$from, $to])
            ->when($request->supplier_id, fn($q, $v) => $q->where('supplier_id', $v))
            ->when($request->status,      fn($q, $v) => $q->where('status', $v))
            ->orderBy('po_date');

        $orders = $query->get();

        $summary = [
            'total_orders' => $orders->count(),
            'total_amount' => $orders->sum('total_amount'),
            'by_status'    => $orders->groupBy('status')->map->count(),
        ];

        return Inertia::render('Reports/Purchase', [
            'orders'    => $orders,
            'summary'   => $summary,
            'suppliers' => Supplier::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'filters'   => $request->only('from', 'to', 'supplier_id', 'status'),
        ]);
    }

    /* ── Stock ── */
    public function stock(Request $request)
    {
        $query = Stock::with(['product.category', 'product.unitOfMeasure'])
            ->when($request->product_type, fn($q, $v) => $q->whereHas('product', fn($pq) => $pq->where('product_type', $v)))
            ->when($request->category_id,  fn($q, $v) => $q->whereHas('product', fn($pq) => $pq->where('category_id', $v)))
            ->when($request->search,       fn($q, $s) => $q->whereHas('product', fn($pq) => $pq->where('name', 'ilike', "%$s%")));

        $stocks = $query->get()->sortBy(fn($s) => $s->product?->name)->values()->map(function ($s) {
            $s->status = $s->quantity <= $s->minimum_stock ? 'low' : 'normal';
            return $s;
        });

        $summary = [
            'total_products' => $stocks->count(),
            'low_stock'      => $stocks->where('status', 'low')->count(),
            'total_value'    => $stocks->sum(fn($s) => $s->quantity * ($s->product?->cost ?? 0)),
        ];

        return Inertia::render('Reports/Stock', [
            'stocks'     => $stocks,
            'summary'    => $summary,
            'categories' => ProductCategory::orderBy('name')->get(['id', 'name']),
            'filters'    => $request->only('product_type', 'category_id', 'search'),
        ]);
    }

    /* ── Stock Card ── */
    public function stockCard(Request $request)
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();

        $product  = $request->product_id ? Product::find($request->product_id) : null;

        $movements = collect();
        $openingBalance = 0;

        if ($product) {
            $movements = StockMovement::with('createdBy')
                ->where('product_id', $product->id)
                ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
                ->orderBy('created_at')
                ->get();

            $openingBalance = StockMovement::where('product_id', $product->id)
                ->where('created_at', '<', $from)
                ->sum(DB::raw("CASE WHEN type IN ('initial_stock','purchase_receipt','purchase_receive','in','adjustment_in','opname_in','transfer_in') THEN quantity ELSE -quantity END"));
        }

        return Inertia::render('Reports/StockCard', [
            'movements'      => $movements,
            'openingBalance' => $openingBalance,
            'product'        => $product,
            'products'       => Product::where('status', 'active')->where('product_type', 'goods')
                                    ->orderBy('name')->get(['id', 'name', 'unit']),
            'filters'        => $request->only('product_id', 'from', 'to'),
        ]);
    }

    /* ── Cash Flow ── */
    public function cashFlow(Request $request)
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();

        $cashIn  = CashTransaction::where('type', 'income')
            ->whereBetween('transaction_date', [$from, $to])
            ->selectRaw("TO_CHAR(transaction_date, 'YYYY-MM') as month, SUM(amount) as total")
            ->groupBy('month')->orderBy('month')->pluck('total', 'month');

        $cashOut = CashTransaction::where('type', 'expense')
            ->whereBetween('transaction_date', [$from, $to])
            ->selectRaw("TO_CHAR(transaction_date, 'YYYY-MM') as month, SUM(amount) as total")
            ->groupBy('month')->orderBy('month')->pluck('total', 'month');

        $bankIn  = BankTransaction::where('type', 'credit')
            ->whereBetween('transaction_date', [$from, $to])
            ->selectRaw("TO_CHAR(transaction_date, 'YYYY-MM') as month, SUM(amount) as total")
            ->groupBy('month')->orderBy('month')->pluck('total', 'month');

        $bankOut = BankTransaction::where('type', 'debit')
            ->whereBetween('transaction_date', [$from, $to])
            ->selectRaw("TO_CHAR(transaction_date, 'YYYY-MM') as month, SUM(amount) as total")
            ->groupBy('month')->orderBy('month')->pluck('total', 'month');

        $months = collect([$cashIn->keys(), $cashOut->keys(), $bankIn->keys(), $bankOut->keys()])
            ->flatten()->unique()->sort()->values();

        $rows = $months->map(fn($m) => [
            'month'    => $m,
            'cash_in'  => $cashIn[$m]  ?? 0,
            'cash_out' => $cashOut[$m] ?? 0,
            'bank_in'  => $bankIn[$m]  ?? 0,
            'bank_out' => $bankOut[$m] ?? 0,
            'net'      => (($cashIn[$m] ?? 0) + ($bankIn[$m] ?? 0)) - (($cashOut[$m] ?? 0) + ($bankOut[$m] ?? 0)),
        ]);

        $summary = [
            'total_in'  => $rows->sum('cash_in') + $rows->sum('bank_in'),
            'total_out' => $rows->sum('cash_out') + $rows->sum('bank_out'),
            'net'       => $rows->sum('net'),
        ];

        return Inertia::render('Reports/CashFlow', [
            'rows'    => $rows,
            'summary' => $summary,
            'filters' => $request->only('from', 'to'),
        ]);
    }

    /* ── Cash/Bank Ledger ── */
    public function cashBankLedger(Request $request)
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();

        $cashRows = CashTransaction::whereBetween('transaction_date', [$from, $to])
            ->when($request->source === 'bank', fn($q) => $q->whereRaw('1=0'))
            ->orderBy('transaction_date')
            ->get()
            ->map(fn($t) => [
                'date'        => $t->transaction_date,
                'source'      => 'cash',
                'source_name' => 'Kas',
                'reference'   => $t->transaction_number,
                'description' => $t->description,
                'debit'       => $t->type === 'income'  ? $t->amount : 0,
                'credit'      => $t->type === 'expense' ? $t->amount : 0,
            ]);

        $bankRows = BankTransaction::with('bankAccount')
            ->whereBetween('transaction_date', [$from, $to])
            ->when($request->source === 'cash', fn($q) => $q->whereRaw('1=0'))
            ->when($request->bank_account_id, fn($q, $v) => $q->where('bank_account_id', $v))
            ->orderBy('transaction_date')
            ->get()
            ->map(fn($t) => [
                'date'        => $t->transaction_date,
                'source'      => 'bank',
                'source_name' => $t->bankAccount?->bank_name . ' - ' . $t->bankAccount?->account_number,
                'reference'   => $t->transaction_number,
                'description' => $t->description,
                'debit'       => $t->type === 'credit' ? $t->amount : 0,
                'credit'      => $t->type === 'debit'  ? $t->amount : 0,
            ]);

        $rows = $cashRows->merge($bankRows)->sortBy('date')->values();

        $runningBalance = 0;
        $rows = $rows->map(function ($row) use (&$runningBalance) {
            $runningBalance += $row['debit'] - $row['credit'];
            return array_merge($row, ['balance' => $runningBalance]);
        });

        return Inertia::render('Reports/CashBankLedger', [
            'rows'         => $rows,
            'bankAccounts' => BankAccount::where('is_active', true)->orderBy('bank_name')->get(['id', 'bank_name', 'account_number']),
            'filters'      => $request->only('from', 'to', 'source', 'bank_account_id'),
            'summary'      => [
                'total_debit'  => $rows->sum('debit'),
                'total_credit' => $rows->sum('credit'),
                'balance'      => $rows->last()['balance'] ?? 0,
            ],
        ]);
    }

    /* ── Costs ── */
    public function costs(Request $request)
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();

        // 1. Cash expense transactions
        $cashCosts = CashTransaction::where('type', 'expense')
            ->whereBetween('transaction_date', [$from, $to])
            ->orderBy('transaction_date')
            ->get()
            ->map(fn($t) => [
                'date'     => $t->transaction_date,
                'category' => $t->category ?? 'Operasional',
                'source'   => 'Kas',
                'description' => $t->description,
                'amount'   => $t->amount,
            ]);

        // 2. Purchase order costs (received only)
        $poCosts = PurchaseOrder::with('items.product')
            ->where('status', 'received')
            ->whereBetween('po_date', [$from, $to])
            ->get()
            ->flatMap(fn($po) => $po->items->map(fn($item) => [
                'date'        => $po->po_date,
                'category'    => 'Pembelian Barang',
                'source'      => 'PO: ' . $po->po_number,
                'description' => $item->product?->name ?? '—',
                'amount'      => $item->subtotal,
            ]));

        // 3. Work order material costs
        $woCosts = WorkOrderMaterial::with(['product', 'workOrder'])
            ->whereHas('workOrder', fn($q) => $q->whereBetween('visit_date', [$from, $to]))
            ->get()
            ->map(fn($m) => [
                'date'        => $m->workOrder?->visit_date,
                'category'    => 'Material WO',
                'source'      => 'WO: ' . ($m->workOrder?->wo_number ?? '—'),
                'description' => $m->product?->name ?? '—',
                'amount'      => $m->quantity_used * ($m->product?->cost ?? 0),
            ]);

        $rows = $cashCosts->merge($poCosts)->merge($woCosts)
            ->sortBy('date')->values();

        $byCategory = $rows->groupBy('category')->map->sum('amount');

        return Inertia::render('Reports/Costs', [
            'rows'       => $rows,
            'byCategory' => $byCategory,
            'summary'    => ['total' => $rows->sum('amount')],
            'filters'    => $request->only('from', 'to'),
        ]);
    }

    /* ── Insentif ── */
    public function insentif(Request $request)
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();
        $rate = (float) ($request->rate ?? 5); // persentase insentif

        $orders = SalesOrder::with(['salesPerson', 'customer'])
            ->whereNotIn('status', ['cancelled'])
            ->whereBetween('order_date', [$from, $to])
            ->when($request->user_id, fn($q, $v) => $q->where('sales_person_id', $v))
            ->orderBy('order_date')
            ->get();

        $byPerson = $orders->groupBy('sales_person_id')->map(function ($personOrders) use ($rate) {
            $person     = $personOrders->first()->salesPerson;
            $totalSales = $personOrders->sum('total_amount');
            return [
                'person_id'   => $person?->id,
                'person_name' => $person?->name ?? '(Tidak ada sales)',
                'order_count' => $personOrders->count(),
                'total_sales' => $totalSales,
                'insentif'    => round($totalSales * $rate / 100),
                'orders'      => $personOrders->map(fn($o) => [
                    'so_number'  => $o->so_number,
                    'order_date' => $o->order_date,
                    'customer'   => $o->customer?->name,
                    'amount'       => $o->total_amount,
                    'status'       => $o->status,
                ]),
            ];
        })->values();

        return Inertia::render('Reports/Insentif', [
            'byPerson' => $byPerson,
            'summary'  => [
                'total_sales'   => $byPerson->sum('total_sales'),
                'total_insentif' => $byPerson->sum('insentif'),
                'rate'          => $rate,
            ],
            'users'   => User::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('from', 'to', 'user_id', 'rate'),
        ]);
    }
}

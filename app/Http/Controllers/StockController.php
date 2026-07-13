<?php

namespace App\Http\Controllers;

use App\Models\Stock;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['quantity', 'minimum_stock', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Stock::with(['product.category', 'warehouse'])
            ->when($request->search, fn($q, $s) => $q->whereHas('product', fn($pq) => $pq->where('name', 'ilike', "%$s%")->orWhere('code', 'ilike', "%$s%")))
            ->when($request->warehouse_id, fn($q, $s) => $q->where('warehouse_id', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Stocks/Index', [
            'stocks'     => $query->paginate(20)->withQueryString(),
            'filters'    => $request->only('search', 'warehouse_id', 'sort_by', 'sort_dir'),
            'warehouses' => Warehouse::where('status', 'active')->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }
}

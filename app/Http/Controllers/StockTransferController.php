<?php

namespace App\Http\Controllers;

use App\Models\StockTransfer;
use App\Models\Employee;
use App\Models\Product;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['transfer_number', 'transfer_date', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = StockTransfer::with(['processedBy', 'sourceWarehouse', 'destinationWarehouse'])
            ->when($request->search, fn($q, $s) => $q->where('transfer_number', 'ilike', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('StockTransfers/Index', [
            'stockTransfers' => $query->paginate(15)->withQueryString(),
            'filters'        => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('StockTransfers/Form', [
            'products'   => Product::where('status', 'active')->orderBy('name')->get(['id', 'name', 'stock']),
            'employees'  => Employee::where('status', 'active')->orderBy('name')->get(['id', 'employee_number', 'name', 'position']),
            'warehouses' => Warehouse::where('status', 'active')->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'transfer_number'  => 'required|string|max:50|unique:stock_transfers,transfer_number',
            'from_warehouse_id'=> 'required|uuid|exists:warehouses,id',
            'to_warehouse_id'  => 'required|uuid|exists:warehouses,id|different:from_warehouse_id',
            'transfer_date'    => 'required|date',
            'processed_by_id'  => 'nullable|uuid|exists:employees,id',
            'status'           => 'required|in:draft,sent,received,cancelled',
            'notes'            => 'nullable|string',
            'items'            => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($data) {
            $transfer = StockTransfer::create(collect($data)->except('items')->toArray());

            foreach ($data['items'] as $item) {
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                ]);
            }
        });

        return redirect('/stock-transfers')->with('success', 'Transfer stok berhasil dibuat.');
    }

    public function edit(StockTransfer $stockTransfer)
    {
        return Inertia::render('StockTransfers/Form', [
            'stockTransfer' => $stockTransfer->load('items'),
            'products'      => Product::where('status', 'active')->orderBy('name')->get(['id', 'name', 'stock']),
            'users'         => User::where('status', 'active')->orderBy('name')->get(),
            'warehouses'    => Warehouse::where('status', 'active')->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function update(Request $request, StockTransfer $stockTransfer)
    {
        $data = $request->validate([
            'transfer_number'  => 'required|string|max:50|unique:stock_transfers,transfer_number,' . $stockTransfer->id,
            'from_warehouse_id'=> 'required|uuid|exists:warehouses,id',
            'to_warehouse_id'  => 'required|uuid|exists:warehouses,id|different:from_warehouse_id',
            'transfer_date'    => 'required|date',
            'processed_by_id'  => 'nullable|uuid|exists:employees,id',
            'status'           => 'required|in:draft,sent,received,cancelled',
            'notes'            => 'nullable|string',
            'items'            => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($data, $stockTransfer) {
            $stockTransfer->update(collect($data)->except('items')->toArray());
            $stockTransfer->items()->delete();

            foreach ($data['items'] as $item) {
                $stockTransfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                ]);
            }
        });

        return redirect('/stock-transfers')->with('success', 'Transfer stok berhasil diperbarui.');
    }

    public function destroy(StockTransfer $stockTransfer)
    {
        $stockTransfer->delete();

        return redirect('/stock-transfers')->with('success', 'Transfer stok berhasil dihapus.');
    }
}

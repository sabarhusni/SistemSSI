<?php

namespace App\Http\Controllers;

use App\Models\Warehouse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['code', 'name', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'code';
        $sortDir  = $request->sort_dir === 'desc' ? 'desc' : 'asc';

        $query = Warehouse::query()
            ->when($request->search, fn($q, $s) => $q->where('name', 'ilike', "%$s%")->orWhere('code', 'ilike', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Warehouses/Index', [
            'warehouses' => $query->paginate(20)->withQueryString(),
            'filters'    => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Warehouses/Form');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'    => 'required|string|max:20|unique:warehouses,code',
            'type'    => 'required|in:pusat,cabang',
            'name'    => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone'   => 'nullable|string|max:30',
            'status'  => 'required|in:active,inactive',
        ]);

        Warehouse::create($data);

        return redirect('/warehouses')->with('success', 'Gudang berhasil ditambahkan.');
    }

    public function edit(Warehouse $warehouse)
    {
        return Inertia::render('Warehouses/Form', ['warehouse' => $warehouse]);
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $data = $request->validate([
            'code'    => 'required|string|max:20|unique:warehouses,code,' . $warehouse->id,
            'type'    => 'required|in:pusat,cabang',
            'name'    => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone'   => 'nullable|string|max:30',
            'status'  => 'required|in:active,inactive',
        ]);

        $warehouse->update($data);

        return redirect('/warehouses')->with('success', 'Gudang berhasil diperbarui.');
    }

    public function destroy(Warehouse $warehouse)
    {
        $warehouse->delete();

        return redirect('/warehouses')->with('success', 'Gudang berhasil dihapus.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\UnitOfMeasure;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnitOfMeasureController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['name', 'symbol', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = UnitOfMeasure::with('baseUnit')
            ->when($request->search, fn($q, $s) => $q->where('name', 'ilike', "%$s%")->orWhere('symbol', 'ilike', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('UnitOfMeasures/Index', [
            'uoms'    => $query->paginate(20)->withQueryString(),
            'filters' => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('UnitOfMeasures/Form', [
            'allUoms' => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'              => 'required|string|max:100',
            'symbol'            => 'required|string|max:20',
            'base_uom_id'       => 'nullable|uuid|exists:unit_of_measures,id',
            'conversion_factor' => 'nullable|numeric|min:0.000001',
            'status'            => 'required|in:active,inactive',
        ]);

        UnitOfMeasure::create($data);

        return redirect('/unit-of-measures')->with('success', 'Satuan berhasil ditambahkan.');
    }

    public function edit(UnitOfMeasure $unitOfMeasure)
    {
        return Inertia::render('UnitOfMeasures/Form', [
            'uom'     => $unitOfMeasure,
            'allUoms' => UnitOfMeasure::where('status', 'active')
                ->where('id', '!=', $unitOfMeasure->id)
                ->orderBy('name')
                ->get(['id', 'name', 'symbol']),
        ]);
    }

    public function update(Request $request, UnitOfMeasure $unitOfMeasure)
    {
        $data = $request->validate([
            'name'              => 'required|string|max:100',
            'symbol'            => 'required|string|max:20',
            'base_uom_id'       => 'nullable|uuid|exists:unit_of_measures,id|different:id',
            'conversion_factor' => 'nullable|numeric|min:0.000001',
            'status'            => 'required|in:active,inactive',
        ]);

        $unitOfMeasure->update($data);

        return redirect('/unit-of-measures')->with('success', 'Satuan berhasil diperbarui.');
    }

    public function destroy(UnitOfMeasure $unitOfMeasure)
    {
        $unitOfMeasure->delete();

        return redirect('/unit-of-measures')->with('success', 'Satuan berhasil dihapus.');
    }
}

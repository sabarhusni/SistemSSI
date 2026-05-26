<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierController extends Controller
{
    private function generateNextCode(): string
    {
        $year   = date('y');
        $prefix = 'SUP' . $year;
        $last   = Supplier::where('code', 'like', $prefix . '%')
            ->orderBy('code', 'desc')
            ->value('code');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function index(Request $request)
    {
        $sortable = ['code', 'name', 'email', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Supplier::query()
            ->when($request->search, fn($q, $s) => $q->where('name', 'ilike', "%$s%")->orWhere('code', 'ilike', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $query->paginate(15)->withQueryString(),
            'filters'   => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Suppliers/Form', [
            'nextCode' => $this->generateNextCode(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'            => 'required|string|max:50|unique:suppliers,code',
            'name'            => 'required|string|max:255',
            'nama_kontak'     => 'nullable|string|max:255',
            'jabatan_kontak'  => 'nullable|string|max:100',
            'npwp'            => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'address'         => 'nullable|string',
            'status'          => 'required|in:active,inactive',
            'notes'           => 'nullable|string',
            'payment_method'  => 'nullable|string|max:100',
            'payment_terms'   => 'nullable|string|max:100',
        ]);

        if (empty($data['code'])) {
            $data['code'] = $this->generateNextCode();
        }

        Supplier::create($data);

        return redirect('/suppliers')->with('success', 'Supplier berhasil ditambahkan.');
    }

    public function edit(Supplier $supplier)
    {
        return Inertia::render('Suppliers/Form', compact('supplier'));
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'code'            => 'required|string|max:50|unique:suppliers,code,' . $supplier->id,
            'name'            => 'required|string|max:255',
            'nama_kontak'     => 'nullable|string|max:255',
            'jabatan_kontak'  => 'nullable|string|max:100',
            'npwp'            => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'address'         => 'nullable|string',
            'status'          => 'required|in:active,inactive',
            'notes'           => 'nullable|string',
            'payment_method'  => 'nullable|string|max:100',
            'payment_terms'   => 'nullable|string|max:100',
        ]);

        $supplier->update($data);

        return redirect('/suppliers')->with('success', 'Supplier berhasil diperbarui.');
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return redirect('/suppliers')->with('success', 'Supplier berhasil dihapus.');
    }
}

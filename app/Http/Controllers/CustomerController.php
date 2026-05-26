<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['code', 'name', 'email', 'city', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Customer::query()
            ->when($request->search, fn($q, $s) => $q->where('name', 'ilike', "%$s%")->orWhere('code', 'ilike', "%$s%")->orWhere('email', 'ilike', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Customers/Index', [
            'customers' => $query->paginate(15)->withQueryString(),
            'filters'   => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    private function generateNextCode(): string
    {
        $year = date('y');
        $prefix = 'CUST' . $year;
        $last = Customer::where('code', 'like', $prefix . '%')
            ->orderBy('code', 'desc')
            ->value('code');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('Customers/Form', [
            'nextCode' => $this->generateNextCode(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'            => 'required|string|max:50|unique:customers,code',
            'name'            => 'required|string|max:255',
            'company_name'    => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'address'         => 'nullable|string',
            'city'            => 'nullable|string|max:100',
            'province'        => 'nullable|string|max:100',
            'postal_code'     => 'nullable|string|max:10',
            'status'          => 'required|in:active,inactive',
            'notes'           => 'nullable|string',
            'payment_method'  => 'nullable|string|max:100',
            'payment_terms'   => 'nullable|string|max:100',
            'npwp'            => 'nullable|string|max:30',
            'jabatan_kontak'  => 'nullable|string|max:100',
        ]);

        if (empty($data['code'])) {
            $data['code'] = $this->generateNextCode();
        }

        Customer::create($data);

        return redirect('/customers')->with('success', 'Customer berhasil ditambahkan.');
    }

    public function edit(Customer $customer)
    {
        return Inertia::render('Customers/Form', compact('customer'));
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'code'            => 'required|string|max:50|unique:customers,code,' . $customer->id,
            'name'            => 'required|string|max:255',
            'company_name'    => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'address'         => 'nullable|string',
            'city'            => 'nullable|string|max:100',
            'province'        => 'nullable|string|max:100',
            'postal_code'     => 'nullable|string|max:10',
            'status'          => 'required|in:active,inactive',
            'notes'           => 'nullable|string',
            'payment_method'  => 'nullable|string|max:100',
            'payment_terms'   => 'nullable|string|max:100',
            'npwp'            => 'nullable|string|max:30',
            'jabatan_kontak'  => 'nullable|string|max:100',
        ]);

        $customer->update($data);

        return redirect('/customers')->with('success', 'Customer berhasil diperbarui.');
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return redirect('/customers')->with('success', 'Customer berhasil dihapus.');
    }
}

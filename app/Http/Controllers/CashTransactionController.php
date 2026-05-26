<?php

namespace App\Http\Controllers;

use App\Models\CashTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CashTransactionController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['transaction_date', 'type', 'category', 'amount', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'transaction_date';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = CashTransaction::query()
            ->when($request->search, fn($q, $s) => $q->where('description', 'ilike', "%$s%")->orWhere('category', 'ilike', "%$s%"))
            ->when($request->type, fn($q, $s) => $q->where('type', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('CashTransactions/Index', [
            'cashTransactions' => $query->paginate(15)->withQueryString(),
            'filters'          => $request->only('search', 'type', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('CashTransactions/Form');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'transaction_date' => 'required|date',
            'type'             => 'required|in:in,out',
            'category'         => 'required|string|max:100',
            'description'      => 'required|string|max:255',
            'amount'           => 'required|numeric|min:0',
            'reference'        => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
        ]);

        CashTransaction::create($data);

        return redirect('/cash-transactions')->with('success', 'Transaksi kas berhasil dicatat.');
    }

    public function edit(CashTransaction $cashTransaction)
    {
        return Inertia::render('CashTransactions/Form', compact('cashTransaction'));
    }

    public function update(Request $request, CashTransaction $cashTransaction)
    {
        $data = $request->validate([
            'transaction_date' => 'required|date',
            'type'             => 'required|in:in,out',
            'category'         => 'required|string|max:100',
            'description'      => 'required|string|max:255',
            'amount'           => 'required|numeric|min:0',
            'reference'        => 'nullable|string|max:100',
            'notes'            => 'nullable|string',
        ]);

        $cashTransaction->update($data);

        return redirect('/cash-transactions')->with('success', 'Transaksi kas berhasil diperbarui.');
    }

    public function destroy(CashTransaction $cashTransaction)
    {
        $cashTransaction->delete();

        return redirect('/cash-transactions')->with('success', 'Transaksi kas berhasil dihapus.');
    }
}

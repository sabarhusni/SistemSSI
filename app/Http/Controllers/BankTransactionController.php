<?php

namespace App\Http\Controllers;

use App\Models\BankTransaction;
use App\Models\BankAccount;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BankTransactionController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['transaction_date', 'type', 'amount', 'reconciliation_status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'transaction_date';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = BankTransaction::with('bankAccount')
            ->when($request->search, fn($q, $s) => $q->where('description', 'ilike', "%$s%")->orWhere('reference', 'ilike', "%$s%"))
            ->when($request->type, fn($q, $s) => $q->where('type', $s))
            ->when($request->reconciliation_status, fn($q, $s) => $q->where('reconciliation_status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('BankTransactions/Index', [
            'bankTransactions' => $query->paginate(15)->withQueryString(),
            'filters'          => $request->only('search', 'type', 'reconciliation_status', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('BankTransactions/Form', [
            'bankAccounts' => BankAccount::orderBy('bank_name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'bank_account_id'       => 'required|uuid|exists:bank_accounts,id',
            'transaction_date'      => 'required|date',
            'type'                  => 'required|in:credit,debit',
            'description'           => 'required|string|max:255',
            'amount'                => 'required|numeric|min:0',
            'reference'             => 'nullable|string|max:100',
            'reconciliation_status' => 'required|in:unmatched,matched,reconciled',
            'notes'                 => 'nullable|string',
        ]);

        BankTransaction::create($data);

        return redirect('/bank-transactions')->with('success', 'Transaksi bank berhasil dicatat.');
    }

    public function edit(BankTransaction $bankTransaction)
    {
        return Inertia::render('BankTransactions/Form', [
            'bankTransaction' => $bankTransaction,
            'bankAccounts'    => BankAccount::orderBy('bank_name')->get(),
        ]);
    }

    public function update(Request $request, BankTransaction $bankTransaction)
    {
        $data = $request->validate([
            'bank_account_id'       => 'required|uuid|exists:bank_accounts,id',
            'transaction_date'      => 'required|date',
            'type'                  => 'required|in:credit,debit',
            'description'           => 'required|string|max:255',
            'amount'                => 'required|numeric|min:0',
            'reference'             => 'nullable|string|max:100',
            'reconciliation_status' => 'required|in:unmatched,matched,reconciled',
            'notes'                 => 'nullable|string',
        ]);

        $bankTransaction->update($data);

        return redirect('/bank-transactions')->with('success', 'Transaksi bank berhasil diperbarui.');
    }

    public function destroy(BankTransaction $bankTransaction)
    {
        $bankTransaction->delete();

        return redirect('/bank-transactions')->with('success', 'Transaksi bank berhasil dihapus.');
    }
}

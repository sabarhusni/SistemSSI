<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Invoice;
use App\Models\BankAccount;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['payment_number', 'payment_date', 'amount', 'payment_method', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Payment::with(['invoice.customer'])
            ->when($request->search, fn($q, $s) => $q->where('payment_number', 'ilike', "%$s%")->orWhereHas('invoice', fn($iq) => $iq->where('invoice_number', 'ilike', "%$s%")))
            ->when($request->payment_method, fn($q, $s) => $q->where('payment_method', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Payments/Index', [
            'payments' => $query->paginate(15)->withQueryString(),
            'filters'  => $request->only('search', 'payment_method', 'sort_by', 'sort_dir'),
        ]);
    }

    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'PAY' . $year;
        $last   = Payment::where('payment_number', 'like', $prefix . '%')
            ->orderBy('payment_number', 'desc')
            ->value('payment_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('Payments/Form', [
            'invoices'     => Invoice::with('customer')->whereIn('status', ['sent', 'draft'])->orderBy('invoice_number')->get(),
            'bankAccounts' => BankAccount::where('status', 'active')->orderBy('bank_name')->get(),
            'nextNumber'   => $this->generateNextNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'invoice_id'      => 'required|uuid|exists:invoices,id',
            'bank_account_id' => 'nullable|uuid|exists:bank_accounts,id',
            'payment_number'  => 'required|string|max:50|unique:payments,payment_number',
            'payment_date'    => 'required|date',
            'amount'          => 'required|numeric|min:0',
            'payment_method'  => 'required|in:bank_transfer,cash,cheque,giro',
            'reference'       => 'nullable|string|max:255',
            'status'          => 'required|in:pending,received,verified,rejected',
            'notes'           => 'nullable|string',
        ]);

        if (empty($data['payment_number'])) {
            $data['payment_number'] = $this->generateNextNumber();
        }

        Payment::create($data);

        return redirect('/payments')->with('success', 'Pembayaran berhasil dicatat.');
    }

    public function edit(Payment $payment)
    {
        return Inertia::render('Payments/Form', [
            'payment'      => $payment,
            'invoices'     => Invoice::with('customer')->orderBy('invoice_number')->get(),
            'bankAccounts' => BankAccount::orderBy('bank_name')->get(),
        ]);
    }

    public function update(Request $request, Payment $payment)
    {
        $data = $request->validate([
            'invoice_id'      => 'required|uuid|exists:invoices,id',
            'bank_account_id' => 'nullable|uuid|exists:bank_accounts,id',
            'payment_number'  => 'required|string|max:50|unique:payments,payment_number,' . $payment->id,
            'payment_date'    => 'required|date',
            'amount'          => 'required|numeric|min:0',
            'payment_method'  => 'required|in:bank_transfer,cash,cheque,giro',
            'reference'       => 'nullable|string|max:255',
            'status'          => 'required|in:pending,received,verified,rejected',
            'notes'           => 'nullable|string',
        ]);

        $payment->update($data);

        return redirect('/payments')->with('success', 'Pembayaran berhasil diperbarui.');
    }

    public function destroy(Payment $payment)
    {
        $payment->delete();

        return redirect('/payments')->with('success', 'Pembayaran berhasil dihapus.');
    }
}

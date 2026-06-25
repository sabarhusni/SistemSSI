<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Invoice;
use App\Models\BankAccount;
use App\Models\WorkOrder;
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

    /**
     * Payment tidak boleh diproses bila Invoice yang dibayar masih menagih bulan
     * layanan yang Work Order-nya aktif (Pending/In Progress) pada SO yang sama.
     * Mengembalikan pesan error bila ada WO aktif, atau null bila layak dibayar.
     */
    private function activeWorkOrderError(?string $invoiceId): ?string
    {
        $invoice = Invoice::with('items:id,invoice_id,month')->find($invoiceId);
        if (!$invoice) {
            return null;
        }

        $months    = $invoice->items->pluck('month')->map(fn($m) => (int) ($m ?? 1))->all();
        $activeWos = WorkOrder::activeForSalesOrderMonths($invoice->sales_order_id, $months);

        if ($activeWos->isEmpty()) {
            return null;
        }

        return 'Pembayaran tidak dapat diproses: Invoice ' . $invoice->invoice_number
            . ' masih memiliki Work Order aktif (' . $activeWos->pluck('wo_number')->join(', ')
            . ') untuk bulan layanan yang ditagih. Selesaikan Work Order tersebut terlebih dahulu.';
    }

    /**
     * Invoice yang sudah punya Payment berstatus received/verified tidak boleh
     * dibayar lagi. Payment yang sedang diedit dikecualikan. Mengembalikan pesan
     * error bila invoice sudah terbayar, atau null bila masih layak dibayar.
     */
    private function alreadyPaidError(?string $invoiceId, ?string $exceptPaymentId = null): ?string
    {
        $invoice = Invoice::find($invoiceId);
        if (!$invoice) {
            return null;
        }

        $exists = $invoice->payments()
            ->whereIn('status', ['received', 'verified'])
            ->when($exceptPaymentId, fn($q) => $q->where('id', '!=', $exceptPaymentId))
            ->exists();

        if (!$exists) {
            return null;
        }

        return 'Pembayaran tidak dapat diproses: Invoice ' . $invoice->invoice_number
            . ' sudah memiliki pembayaran berstatus Received/Verified.';
    }

    /**
     * Sinkronkan Invoice dari pembayaran yang sudah Verified:
     * - paid_amount = total seluruh payment berstatus verified pada invoice ini
     *   (mengisi Settlement Amount Sales Order yang dihitung dari SUM paid_amount).
     * - status invoice menjadi 'paid' bila sudah lunas penuh; bila tidak lagi lunas
     *   (mis. payment diubah/ditolak/dihapus) dikembalikan ke 'sent'.
     */
    private function syncInvoice(?Invoice $invoice): void
    {
        if (!$invoice) {
            return;
        }

        $paid  = (float) $invoice->payments()->where('status', 'verified')->sum('amount');
        $total = (float) $invoice->total_amount;

        $invoice->paid_amount = $paid;

        if ($total > 0 && $paid >= $total) {
            $invoice->status = 'paid';
        } elseif ($invoice->status === 'paid') {
            $invoice->status = 'sent';
        }

        $invoice->save();
    }

    public function create()
    {
        return Inertia::render('Payments/Form', [
            'invoices'     => Invoice::with('customer')
                ->where('status', 'sent')
                ->whereDoesntHave('payments', fn($q) => $q->whereIn('status', ['received', 'verified']))
                ->orderBy('invoice_number')->get(),
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

        if ($error = $this->activeWorkOrderError($data['invoice_id'])) {
            return back()->withErrors(['invoice_id' => $error])->withInput();
        }

        if ($error = $this->alreadyPaidError($data['invoice_id'])) {
            return back()->withErrors(['invoice_id' => $error])->withInput();
        }

        if (empty($data['payment_number'])) {
            $data['payment_number'] = $this->generateNextNumber();
        }

        $payment = Payment::create($data);

        $this->syncInvoice($payment->invoice);

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
        // Payment yang sudah Verified hanya bisa dilihat, tidak dapat diubah.
        if ($payment->status === 'verified') {
            return redirect('/payments')->with('error', 'Pembayaran yang sudah Verified tidak dapat diubah.');
        }

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

        if ($error = $this->activeWorkOrderError($data['invoice_id'])) {
            return back()->withErrors(['invoice_id' => $error])->withInput();
        }

        if ($error = $this->alreadyPaidError($data['invoice_id'], $payment->id)) {
            return back()->withErrors(['invoice_id' => $error])->withInput();
        }

        $oldInvoiceId = $payment->invoice_id;

        $payment->update($data);

        // Sinkronkan invoice baru, dan invoice lama bila pembayaran dipindah ke invoice lain.
        $this->syncInvoice($payment->fresh()->invoice);
        if ($oldInvoiceId && $oldInvoiceId !== $payment->invoice_id) {
            $this->syncInvoice(Invoice::find($oldInvoiceId));
        }

        return redirect('/payments')->with('success', 'Pembayaran berhasil diperbarui.');
    }

    public function destroy(Payment $payment)
    {
        // Pembayaran yang sudah Verified tidak dapat dihapus.
        if ($payment->status === 'verified') {
            return redirect('/payments')->with('error', 'Pembayaran yang sudah Verified tidak dapat dihapus.');
        }

        $invoice = $payment->invoice;

        $payment->delete();

        // Pembayaran hilang → hitung ulang paid_amount & status invoice.
        $this->syncInvoice($invoice);

        return redirect('/payments')->with('success', 'Pembayaran berhasil dihapus.');
    }
}

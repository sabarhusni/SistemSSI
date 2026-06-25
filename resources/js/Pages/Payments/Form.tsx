import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ payment, invoices, bankAccounts, nextNumber }: any) {
    const editing = !!payment;
    // Payment yang sudah Verified hanya bisa dilihat, tidak dapat diubah.
    const locked = editing && payment?.status === 'verified';
    const lockCls = locked ? ' bg-gray-100 cursor-not-allowed' : '';
    const { data, setData, post, put, processing, errors } = useForm<any>({
        invoice_id:      payment?.invoice_id      ?? '',
        bank_account_id: payment?.bank_account_id ?? '',
        payment_number:  payment?.payment_number  ?? nextNumber ?? '',
        payment_date:    payment?.payment_date    ?? '',
        amount:          payment?.amount          ?? '',
        payment_method:  payment?.payment_method  ?? 'bank_transfer',
        reference:       payment?.reference       ?? '',
        status:          payment?.status          ?? 'received',
        notes:           payment?.notes           ?? '',
    });

    // Pilih invoice: Amount otomatis terisi sisa tagihan (total − sudah dibayar).
    const handleSelectInvoice = (id: string) => {
        const inv = invoices?.find((i: any) => String(i.id) === String(id));
        const total     = Number(inv?.total_amount ?? 0);
        const paid       = Number(inv?.paid_amount ?? 0);
        const outstanding = Math.max(0, total - paid);
        setData({
            ...data,
            invoice_id: id,
            amount:     inv ? (outstanding || total) : '',
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (locked) return;
        editing ? put(`/payments/${payment.id}`) : post('/payments');
    };

    return (
        <AppLayout header={locked ? 'View Payment' : editing ? 'Edit Payment' : 'Record Payment'}>
            <Head title="Payment" />
            <div className="max-w-2xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    {locked && (
                        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                            Pembayaran ini sudah <span className="font-semibold">Verified</span> sehingga hanya dapat dilihat dan tidak dapat diubah.
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Payment No." error={errors.payment_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.payment_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Payment Date" error={errors.payment_date} required>
                            <input type="date" className={inputCls + lockCls} value={data.payment_date} disabled={locked} onChange={e => setData('payment_date', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Invoice" error={errors.invoice_id} required>
                        <select className={inputCls + lockCls} value={data.invoice_id} disabled={locked} onChange={e => handleSelectInvoice(e.target.value)}>
                            <option value="">— Select Invoice —</option>
                            {invoices?.map((inv: any) => (
                                <option key={inv.id} value={inv.id}>{inv.invoice_number} – {inv.customer?.name}</option>
                            ))}
                        </select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Payment Method">
                            <select className={inputCls + lockCls} value={data.payment_method} disabled={locked} onChange={e => setData('payment_method', e.target.value)}>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash">Cash</option>
                                <option value="cheque">Cheque</option>
                                <option value="giro">Giro</option>
                            </select>
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls + lockCls} value={data.status} disabled={locked} onChange={e => setData('status', e.target.value)}>
                                <option value="received">Received</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </FormField>
                    </div>
                    <FormField label="Amount (Rp)" error={errors.amount} required>
                        <input type="number" min={0} className={inputCls + lockCls} value={data.amount} disabled={locked} onChange={e => setData('amount', e.target.value)} />
                    </FormField>
                    <FormField label="Bank Account">
                        <select className={inputCls + lockCls} value={data.bank_account_id} disabled={locked} onChange={e => setData('bank_account_id', e.target.value)}>
                            <option value="">— Select Account —</option>
                            {bankAccounts?.map((ba: any) => (
                                <option key={ba.id} value={ba.id}>{ba.bank_name} – {ba.account_number}</option>
                            ))}
                        </select>
                    </FormField>
                    <FormField label="Reference / Transfer No.">
                        <input className={inputCls + lockCls} value={data.reference} disabled={locked} onChange={e => setData('reference', e.target.value)} placeholder="Transfer receipt no..." />
                    </FormField>
                    <FormField label="Notes">
                        <textarea rows={2} className={inputCls + lockCls} value={data.notes} disabled={locked} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        {!locked && (
                            <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                                {processing ? 'Saving...' : 'Save'}
                            </button>
                        )}
                        <Link href="/payments" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">{locked ? 'Back' : 'Cancel'}</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

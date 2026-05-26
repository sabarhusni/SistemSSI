import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ payment, invoices, bankAccounts, nextNumber }: any) {
    const editing = !!payment;
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/payments/${payment.id}`) : post('/payments');
    };

    return (
        <AppLayout header={editing ? 'Edit Pembayaran' : 'Catat Pembayaran'}>
            <Head title="Pembayaran" />
            <div className="max-w-2xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="No. Pembayaran" error={errors.payment_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.payment_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Tgl Pembayaran" error={errors.payment_date} required>
                            <input type="date" className={inputCls} value={data.payment_date} onChange={e => setData('payment_date', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Invoice" error={errors.invoice_id} required>
                        <select className={inputCls} value={data.invoice_id} onChange={e => setData('invoice_id', e.target.value)}>
                            <option value="">— Pilih Invoice —</option>
                            {invoices?.map((inv: any) => (
                                <option key={inv.id} value={inv.id}>{inv.invoice_number} – {inv.customer?.name}</option>
                            ))}
                        </select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Metode Pembayaran">
                            <select className={inputCls} value={data.payment_method} onChange={e => setData('payment_method', e.target.value)}>
                                <option value="bank_transfer">Transfer Bank</option>
                                <option value="cash">Tunai</option>
                                <option value="cheque">Cek</option>
                                <option value="giro">Giro</option>
                            </select>
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="received">Diterima</option>
                                <option value="verified">Diverifikasi</option>
                                <option value="rejected">Ditolak</option>
                            </select>
                        </FormField>
                    </div>
                    <FormField label="Jumlah (Rp)" error={errors.amount} required>
                        <input type="number" min={0} className={inputCls} value={data.amount} onChange={e => setData('amount', e.target.value)} />
                    </FormField>
                    <FormField label="Rekening Bank">
                        <select className={inputCls} value={data.bank_account_id} onChange={e => setData('bank_account_id', e.target.value)}>
                            <option value="">— Pilih Rekening —</option>
                            {bankAccounts?.map((ba: any) => (
                                <option key={ba.id} value={ba.id}>{ba.bank_name} – {ba.account_number}</option>
                            ))}
                        </select>
                    </FormField>
                    <FormField label="Referensi / No. Transfer">
                        <input className={inputCls} value={data.reference} onChange={e => setData('reference', e.target.value)} placeholder="No. bukti transfer..." />
                    </FormField>
                    <FormField label="Catatan">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/payments" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

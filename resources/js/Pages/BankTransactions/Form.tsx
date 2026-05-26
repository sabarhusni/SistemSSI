import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ bankTransaction, bankAccounts }: any) {
    const editing = !!bankTransaction;
    const { data, setData, post, put, processing, errors } = useForm<any>({
        bank_account_id:        bankTransaction?.bank_account_id        ?? '',
        transaction_date:       bankTransaction?.transaction_date       ?? '',
        type:                   bankTransaction?.type                   ?? 'credit',
        description:            bankTransaction?.description            ?? '',
        amount:                 bankTransaction?.amount                 ?? '',
        reference:              bankTransaction?.reference              ?? '',
        reconciliation_status:  bankTransaction?.reconciliation_status  ?? 'unmatched',
        notes:                  bankTransaction?.notes                  ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/bank-transactions/${bankTransaction.id}`) : post('/bank-transactions');
    };

    return (
        <AppLayout header={editing ? 'Edit Transaksi Bank' : 'Catat Transaksi Bank'}>
            <Head title="Transaksi Bank" />
            <div className="max-w-2xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Rekening Bank" error={errors.bank_account_id} required>
                        <select className={inputCls} value={data.bank_account_id} onChange={e => setData('bank_account_id', e.target.value)}>
                            <option value="">— Pilih Rekening —</option>
                            {bankAccounts?.map((ba: any) => (
                                <option key={ba.id} value={ba.id}>{ba.bank_name} – {ba.account_number} ({ba.account_name})</option>
                            ))}
                        </select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Tanggal Transaksi" error={errors.transaction_date} required>
                            <input type="date" className={inputCls} value={data.transaction_date} onChange={e => setData('transaction_date', e.target.value)} />
                        </FormField>
                        <FormField label="Tipe">
                            <select className={inputCls} value={data.type} onChange={e => setData('type', e.target.value)}>
                                <option value="credit">Kredit (Masuk)</option>
                                <option value="debit">Debit (Keluar)</option>
                            </select>
                        </FormField>
                    </div>
                    <FormField label="Deskripsi" error={errors.description} required>
                        <input className={inputCls} value={data.description} onChange={e => setData('description', e.target.value)} />
                    </FormField>
                    <FormField label="Jumlah (Rp)" error={errors.amount} required>
                        <input type="number" min={0} className={inputCls} value={data.amount} onChange={e => setData('amount', e.target.value)} />
                    </FormField>
                    <FormField label="Referensi">
                        <input className={inputCls} value={data.reference} onChange={e => setData('reference', e.target.value)} placeholder="No. referensi / mutasi..." />
                    </FormField>
                    <FormField label="Status Rekonsiliasi">
                        <select className={inputCls} value={data.reconciliation_status} onChange={e => setData('reconciliation_status', e.target.value)}>
                            <option value="unmatched">Belum Cocok</option>
                            <option value="matched">Cocok</option>
                            <option value="reconciled">Direkonsiliasi</option>
                        </select>
                    </FormField>
                    <FormField label="Catatan">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/bank-transactions" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

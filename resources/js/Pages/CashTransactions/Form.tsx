import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

const CATEGORIES_IN = ['Pembayaran Customer', 'Pinjaman', 'Modal', 'Lain-lain Masuk'];
const CATEGORIES_OUT = ['Pembelian Bahan', 'Biaya Operasional', 'Gaji', 'Utilitas', 'Transportasi', 'Lain-lain Keluar'];

export default function Form({ cashTransaction }: any) {
    const editing = !!cashTransaction;
    const { data, setData, post, put, processing, errors } = useForm<any>({
        transaction_date: cashTransaction?.transaction_date ?? '',
        type:             cashTransaction?.type             ?? 'in',
        category:         cashTransaction?.category         ?? '',
        description:      cashTransaction?.description      ?? '',
        amount:           cashTransaction?.amount           ?? '',
        reference:        cashTransaction?.reference        ?? '',
        notes:            cashTransaction?.notes            ?? '',
    });

    const categories = data.type === 'in' ? CATEGORIES_IN : CATEGORIES_OUT;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/cash-transactions/${cashTransaction.id}`) : post('/cash-transactions');
    };

    return (
        <AppLayout header={editing ? 'Edit Transaksi Kas' : 'Catat Transaksi Kas'}>
            <Head title="Transaksi Kas" />
            <div className="max-w-2xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Tanggal Transaksi" error={errors.transaction_date} required>
                            <input type="date" className={inputCls} value={data.transaction_date} onChange={e => setData('transaction_date', e.target.value)} />
                        </FormField>
                        <FormField label="Tipe">
                            <select className={inputCls} value={data.type} onChange={e => { setData('type', e.target.value); setData('category', ''); }}>
                                <option value="in">Kas Masuk</option>
                                <option value="out">Kas Keluar</option>
                            </select>
                        </FormField>
                    </div>
                    <FormField label="Kategori" error={errors.category} required>
                        <select className={inputCls} value={data.category} onChange={e => setData('category', e.target.value)}>
                            <option value="">— Pilih Kategori —</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Deskripsi" error={errors.description} required>
                        <input className={inputCls} value={data.description} onChange={e => setData('description', e.target.value)} />
                    </FormField>
                    <FormField label="Jumlah (Rp)" error={errors.amount} required>
                        <input type="number" min={0} className={inputCls} value={data.amount} onChange={e => setData('amount', e.target.value)} />
                    </FormField>
                    <FormField label="Referensi">
                        <input className={inputCls} value={data.reference} onChange={e => setData('reference', e.target.value)} placeholder="No. kwitansi / referensi..." />
                    </FormField>
                    <FormField label="Catatan">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/cash-transactions" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

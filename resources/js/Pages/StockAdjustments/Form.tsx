import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

const REASONS = [
    'Koreksi Stok Fisik', 'Barang Rusak / Kadaluarsa', 'Selisih Opname',
    'Retur Pembelian', 'Penyesuaian Awal', 'Lain-lain',
];

export default function Form({ stockAdjustment, products, nextNumber }: any) {
    const editing = !!stockAdjustment;
    const { data, setData, post, put, processing, errors } = useForm<any>({
        product_id:         stockAdjustment?.product_id         ?? '',
        adjustment_number:  stockAdjustment?.adjustment_number  ?? nextNumber ?? '',
        adjustment_date:    stockAdjustment?.adjustment_date    ?? '',
        type:               stockAdjustment?.type               ?? 'addition',
        quantity_adjusted:  stockAdjustment?.quantity_adjusted  ?? '',
        reason:             stockAdjustment?.reason             ?? '',
        notes:              stockAdjustment?.notes              ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/stock-adjustments/${stockAdjustment.id}`) : post('/stock-adjustments');
    };

    return (
        <AppLayout header={editing ? 'Edit Penyesuaian Stok' : 'Penyesuaian Stok'}>
            <Head title="Penyesuaian Stok" />
            <div className="max-w-2xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="No. Penyesuaian" error={errors.adjustment_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.adjustment_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Tgl Penyesuaian" error={errors.adjustment_date} required>
                            <input type="date" className={inputCls} value={data.adjustment_date} onChange={e => setData('adjustment_date', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Produk" error={errors.product_id} required>
                        <select className={inputCls} value={data.product_id} onChange={e => setData('product_id', e.target.value)}>
                            <option value="">— Pilih Produk —</option>
                            {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Stok saat ini: {p.stock})</option>)}
                        </select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Tipe Penyesuaian">
                            <select className={inputCls} value={data.type} onChange={e => setData('type', e.target.value)}>
                                <option value="addition">Penambahan (+)</option>
                                <option value="subtraction">Pengurangan (-)</option>
                            </select>
                        </FormField>
                        <FormField label="Qty Penyesuaian" error={errors.quantity_adjusted} required>
                            <input type="number" min={1} className={inputCls} value={data.quantity_adjusted} onChange={e => setData('quantity_adjusted', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Alasan" error={errors.reason} required>
                        <select className={inputCls} value={data.reason} onChange={e => setData('reason', e.target.value)}>
                            <option value="">— Pilih Alasan —</option>
                            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Catatan">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/stock-adjustments" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

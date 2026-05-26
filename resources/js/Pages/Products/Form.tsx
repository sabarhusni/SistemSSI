import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ product, categories, uoms, nextCode }: any) {
    const editing = !!product;
    const { data, setData, post, put, processing, errors } = useForm({
        category_id:        product?.category_id        ?? '',
        unit_of_measure_id: product?.unit_of_measure_id ?? '',
        code:               product?.code               ?? nextCode ?? '',
        name:               product?.name               ?? '',
        description:        product?.description        ?? '',
        internal_note:      product?.internal_note      ?? '',
        sales_price:        product?.sales_price        ?? '',
        cost:               product?.cost               ?? '',
        stock:              product?.stock              ?? 0,
        product_type:       product?.product_type       ?? 'goods',
        status:             product?.status             ?? 'active',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/products/${product.id}`) : post('/products');
    };

    return (
        <AppLayout header={editing ? 'Edit Produk' : 'Tambah Produk'}>
            <Head title={editing ? 'Edit Produk' : 'Tambah Produk'} />
            <div className="max-w-3xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    {/* Tipe Produk */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Produk <span className="text-red-500">*</span></label>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="product_type"
                                    value="goods"
                                    checked={data.product_type === 'goods'}
                                    onChange={() => setData('product_type', 'goods')}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-700 font-medium">Goods</span>
                                <span className="text-xs text-gray-400">(Berpengaruh ke mutasi stok)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="product_type"
                                    value="service"
                                    checked={data.product_type === 'service'}
                                    onChange={() => setData('product_type', 'service')}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-700 font-medium">Service</span>
                                <span className="text-xs text-gray-400">(Tidak berpengaruh ke stok)</span>
                            </label>
                        </div>
                        {errors.product_type && <p className="mt-1 text-xs text-red-500">{errors.product_type}</p>}
                    </div>

                    {/* Kode & Kategori */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Kode" error={errors.code} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.code} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Kategori">
                            <select className={inputCls} value={data.category_id} onChange={e => setData('category_id', e.target.value)}>
                                <option value="">— Pilih Kategori —</option>
                                {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </FormField>
                    </div>

                    {/* Nama Produk */}
                    <FormField label="Nama Produk" error={errors.name} required>
                        <input className={inputCls} value={data.name} onChange={e => setData('name', e.target.value)} />
                    </FormField>

                    {/* Deskripsi */}
                    <FormField label="Deskripsi">
                        <textarea rows={2} className={inputCls} value={data.description} onChange={e => setData('description', e.target.value)} />
                    </FormField>

                    {/* Internal Note */}
                    <FormField label="Catatan Internal">
                        <textarea
                            rows={2}
                            className={inputCls}
                            value={data.internal_note}
                            onChange={e => setData('internal_note', e.target.value)}
                            placeholder="Catatan internal (tidak ditampilkan ke customer)"
                        />
                    </FormField>

                    {/* Satuan */}
                    <FormField label="Unit of Measure">
                        <select
                            className={inputCls}
                            value={data.unit_of_measure_id}
                            onChange={e => setData('unit_of_measure_id', e.target.value)}
                        >
                            <option value="">— Pilih Satuan —</option>
                            {uoms?.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                            ))}
                        </select>
                    </FormField>

                    {/* Harga */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Harga Jual (Sales Price)" error={errors.sales_price}>
                            <input
                                type="number"
                                min={0}
                                className={inputCls}
                                value={data.sales_price}
                                onChange={e => setData('sales_price', e.target.value)}
                            />
                        </FormField>
                        <FormField label="Harga Pokok (Cost)" error={errors.cost}>
                            <input
                                type="number"
                                min={0}
                                className={inputCls}
                                value={data.cost}
                                onChange={e => setData('cost', e.target.value)}
                            />
                        </FormField>
                    </div>

                    {/* Qty on Hand - hanya untuk Goods */}
                    {data.product_type === 'goods' && (
                        <FormField label="Quantity On Hand">
                            <input
                                type="number"
                                min={0}
                                className={`${inputCls} ${editing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                value={data.stock}
                                onChange={e => setData('stock', +e.target.value)}
                                disabled={editing}
                            />
                            {editing && <p className="mt-1 text-xs text-gray-400">Stok diubah melalui transaksi inventori.</p>}
                        </FormField>
                    )}

                    {/* Status */}
                    <FormField label="Status">
                        <label className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                checked={data.status === 'active'}
                                onChange={e => setData('status', e.target.checked ? 'active' : 'inactive')}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700">Aktif</span>
                        </label>
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/products" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ProductPickerModal from '@/Components/ProductPickerModal';
import SupplierPickerModal from '@/Components/SupplierPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const normalizeItem = (it: any) => ({
    product_id: it.product_id ?? '',
    quantity:   it.quantity   ?? 1,
    unit:       it.unit       ?? '',
    pph:        it.pph        !== null && it.pph !== undefined ? Number(it.pph) : 0,
    unit_price: it.unit_price !== null && it.unit_price !== undefined ? Number(it.unit_price) : 0,
    subtotal:   it.subtotal   ?? 0,
});

const emptyItem = () => normalizeItem({});

export default function Form({ purchaseOrder, suppliers, products, uoms = [], nextNumber, taxType = 'exclude', taxRatePo = 11 }: any) {
    const editing = !!purchaseOrder;

    const { data, setData, post, put, processing, errors } = useForm<any>({
        supplier_id:            purchaseOrder?.supplier_id            ?? '',
        po_number:              purchaseOrder?.po_number              ?? nextNumber ?? '',
        po_date:                purchaseOrder?.po_date                ?? '',
        expected_delivery_date: purchaseOrder?.expected_delivery_date ?? '',
        status:                 purchaseOrder?.status                 ?? 'draft',
        notes:                  purchaseOrder?.notes                  ?? '',
        payment_terms:          purchaseOrder?.payment_terms          ?? '',
        items: purchaseOrder?.items
            ? purchaseOrder.items.map(normalizeItem)
            : [emptyItem()],
    });

    const [pickerIdx, setPickerIdx]               = useState<number | null>(null);
    const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);

    const selectedSupplier = suppliers?.find((s: any) => s.id === data.supplier_id);
    const getProduct       = (id: string) => products?.find((p: any) => p.id === id);

    // Detect duplicate product_ids
    const duplicateIds = useMemo(() => {
        const ids = data.items.map((it: any) => it.product_id).filter(Boolean);
        return new Set(ids.filter((id: string, idx: number) => ids.indexOf(id) !== idx));
    }, [data.items]);

    const updateItem = (i: number, field: string, rawValue: any) => {
        const value = ['quantity', 'unit_price', 'pph'].includes(field) ? Number(rawValue) || 0 : rawValue;
        const items = [...data.items];
        items[i] = { ...items[i], [field]: value };
        const sub = (items[i].quantity || 0) * (items[i].unit_price || 0);
        items[i].subtotal = sub;
        setData('items', items);
    };

    const handleSelectProduct = (product: any) => {
        if (pickerIdx === null) return;
        const items = [...data.items];
        const cur   = items[pickerIdx];
        const price = cur.unit_price > 0 ? cur.unit_price : Number(product.cost) || 0;
        items[pickerIdx] = {
            ...cur,
            product_id: product.id,
            unit:       cur.unit || product.unit_of_measure?.symbol || '',
            pph:        cur.pph > 0 ? cur.pph : taxRatePo,
            unit_price: price,
            subtotal:   (cur.quantity || 1) * price,
        };
        setData('items', items);
        setPickerIdx(null);
    };

    // PPH per item: exclude = subtotal × rate/100, include = subtotal × rate/(100+rate)
    const pphOf = (item: any) => {
        const sub  = item.subtotal || 0;
        const rate = item.pph || 0;
        if (rate <= 0) return 0;
        return taxType === 'exclude'
            ? sub * rate / 100
            : sub * rate / (100 + rate);
    };

    const subtotalAll = data.items.reduce((s: number, it: any) => s + (it.subtotal || 0), 0);
    const pphAll      = data.items.reduce((s: number, it: any) => s + pphOf(it), 0);

    // exclude: grand = subtotal + tax | include: grand = subtotal (tax embedded)
    const grandTotal  = taxType === 'exclude' ? subtotalAll + pphAll : subtotalAll;
    // include: base before tax = subtotal - extracted tax
    const baseAmount  = taxType === 'include'  ? subtotalAll - pphAll : subtotalAll;

    const hasDuplicates = duplicateIds.size > 0;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasDuplicates) return;
        editing ? put(`/purchase-orders/${purchaseOrder.id}`) : post('/purchase-orders');
    };

    return (
        <AppLayout header={editing ? 'Edit Purchase Order' : 'Buat Purchase Order'}>
            <Head title="Purchase Order" />

            {pickerIdx !== null && (
                <ProductPickerModal
                    products={products ?? []}
                    onSelect={handleSelectProduct}
                    onClose={() => setPickerIdx(null)}
                    extraLabel="Harga Pokok"
                    extraKey="cost"
                    extraFormat="currency"
                />
            )}

            {supplierPickerOpen && (
                <SupplierPickerModal
                    suppliers={suppliers ?? []}
                    onSelect={s => { setData('supplier_id', s.id); setSupplierPickerOpen(false); }}
                    onClose={() => setSupplierPickerOpen(false)}
                />
            )}

            <div className="max-w-5xl bg-white rounded-xl shadow p-6 space-y-4">
                <form onSubmit={submit}>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <FormField label="No. PO" error={errors.po_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.po_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Tgl PO" error={errors.po_date} required>
                            <input type="date" className={inputCls} value={data.po_date} onChange={e => setData('po_date', e.target.value)} />
                        </FormField>
                        <FormField label="Tgl Exp. Terima">
                            <input type="date" className={inputCls} value={data.expected_delivery_date} onChange={e => setData('expected_delivery_date', e.target.value)} />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <FormField label="Supplier" error={errors.supplier_id} required>
                            <button
                                type="button"
                                onClick={() => setSupplierPickerOpen(true)}
                                className={`w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ${errors.supplier_id ? 'border-red-400' : ''}`}
                            >
                                {selectedSupplier
                                    ? <span className="text-gray-800 font-medium">{selectedSupplier.name}</span>
                                    : <span className="text-gray-400">— Pilih Supplier —</span>
                                }
                            </button>
                            {selectedSupplier?.phone && (
                                <p className="text-xs text-gray-400 mt-1">{selectedSupplier.phone}</p>
                            )}
                        </FormField>
                        <FormField label="Payment Terms">
                            <select className={inputCls} value={data.payment_terms} onChange={e => setData('payment_terms', e.target.value)}>
                                <option value="">— Pilih —</option>
                                <option value="COD">COD</option>
                                <option value="NET7">NET 7</option>
                                <option value="NET14">NET 14</option>
                                <option value="NET30">NET 30</option>
                                <option value="NET45">NET 45</option>
                                <option value="NET60">NET 60</option>
                            </select>
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="sent">Terkirim</option>
                                <option value="received">Diterima</option>
                                <option value="cancelled">Dibatalkan</option>
                            </select>
                        </FormField>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-700">Item Pembelian</h3>
                        <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-1">
                            PPH: <strong>{taxType === 'exclude' ? 'Tax Exclude' : 'Tax Include'}</strong>
                        </span>
                    </div>

                    {hasDuplicates && (
                        <div className="mb-2 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                            Terdapat produk yang sama dalam daftar item. Harap hapus duplikat sebelum menyimpan.
                        </div>
                    )}

                    <div className="border rounded-lg overflow-hidden mb-2">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-left text-gray-600">
                                    <th className="px-3 py-2">Produk</th>
                                    <th className="px-3 py-2 w-20">Qty</th>
                                    <th className="px-3 py-2 w-20">Unit</th>
                                    <th className="px-3 py-2 w-32">Harga Satuan</th>
                                    <th className="px-3 py-2 w-20">PPH (%)</th>
                                    {taxType === 'exclude' && <th className="px-3 py-2 w-28 text-right">PPH (Rp)</th>}
                                    <th className="px-3 py-2 w-32 text-right">Subtotal</th>
                                    <th className="px-3 py-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.items.map((item: any, i: number) => {
                                    const selected    = getProduct(item.product_id);
                                    const isDuplicate = item.product_id && duplicateIds.has(item.product_id);
                                    return (
                                        <tr key={i} className={isDuplicate ? 'bg-red-50' : ''}>
                                            <td className="px-3 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPickerIdx(i)}
                                                    className={`w-full text-left px-3 py-1.5 border rounded-md text-sm bg-white hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ${isDuplicate ? 'border-red-400' : ''}`}
                                                >
                                                    {selected
                                                        ? <span className="text-gray-800">{selected.name}</span>
                                                        : <span className="text-gray-400">— Pilih Produk —</span>
                                                    }
                                                </button>
                                                {isDuplicate && <p className="text-xs text-red-500 mt-1">Produk sudah ada di baris lain</p>}
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" min={1} className={inputCls} value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select className={inputCls} value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                                                    <option value="">— Pilih —</option>
                                                    {uoms.map((u: any) => (
                                                        <option key={u.id} value={u.symbol}>{u.symbol} — {u.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" min={0} className={inputCls} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" step="0.01" min={0} max={100} className={inputCls} value={item.pph} onChange={e => updateItem(i, 'pph', e.target.value)} />
                                            </td>
                                            {taxType === 'exclude' && (
                                                <td className="px-3 py-2 text-right text-amber-600 text-xs">{fmt(pphOf(item))}</td>
                                            )}
                                            <td className="px-3 py-2 text-right font-medium">
                                                {fmt(item.subtotal)}
                                                {taxType === 'include' && item.pph > 0 && (
                                                    <div className="text-xs text-gray-400 italic">PPH: {fmt(pphOf(item))}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setData('items', data.items.filter((_: any, idx: number) => idx !== i))}
                                                    className="text-red-500 text-lg"
                                                >×</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t text-sm">
                                <tr className="text-gray-600">
                                    <td colSpan={taxType === 'exclude' ? 6 : 5} className="px-3 py-1 text-right">
                                        {taxType === 'include' ? 'Harga Sebelum Pajak' : 'Subtotal (sebelum PPH)'}
                                    </td>
                                    <td className="px-3 py-1 text-right">{fmt(baseAmount)}</td>
                                    <td></td>
                                </tr>
                                <tr className="text-gray-600">
                                    <td colSpan={taxType === 'exclude' ? 6 : 5} className="px-3 py-1 text-right">
                                        {taxType === 'include' ? 'Jumlah PPH (termasuk)' : 'Jumlah PPH'}
                                    </td>
                                    <td className="px-3 py-1 text-right text-amber-600">{fmt(pphAll)}</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colSpan={taxType === 'exclude' ? 6 : 5} className="px-3 py-2 text-right font-semibold">
                                        {taxType === 'exclude' ? 'Grand Total (incl. PPH)' : 'Total'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-emerald-700">{fmt(grandTotal)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <button
                        type="button"
                        onClick={() => setData('items', [...data.items, emptyItem()])}
                        className="text-sm text-emerald-600 hover:underline mb-4"
                    >
                        + Tambah Item
                    </button>

                    <FormField label="Catatan">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing || hasDuplicates}
                            className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/purchase-orders" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

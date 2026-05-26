import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ProductPickerModal from '@/Components/ProductPickerModal';
import ContractPickerModal from '@/Components/ContractPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const emptyItem = (taxRate = 0) => ({
    product_id:     '',
    quantity:       1,
    uom:            '',
    uom_conversion: 1,
    unit_price:     '',
    tax_rate:       taxRate,
    tax_amount:     0,
    subtotal:       0,
});

// Build default SO items from contract services.
// Quantity = service.quantity × visit_frequency (total visits).
function itemsFromContract(contract: any, taxRate: number): any[] {
    if (!contract?.services?.length) return [emptyItem(taxRate)];
    return contract.services.map((svc: any) => {
        const qty   = (svc.quantity ?? 1) * (contract.visit_frequency ?? 1);
        const price = svc.unit_price ?? svc.product?.sales_price ?? svc.product?.price ?? 0;
        const sub   = qty * price;
        return {
            product_id:     svc.product_id,
            quantity:       qty,
            uom:            svc.product?.unit ?? '',
            uom_conversion: 1,
            unit_price:     price,
            tax_rate:       taxRate,
            tax_amount:     0,
            subtotal:       sub,
        };
    });
}

export default function Form({ salesOrder, contracts, products, uoms = [], nextNumber, taxType = 'exclude', taxRateSo = 11 }: any) {
    const editing = !!salesOrder;

    const { data, setData, post, put, processing, errors } = useForm<any>({
        contract_id: salesOrder?.contract_id ?? '',
        customer_id: salesOrder?.customer_id ?? '',
        so_number:   salesOrder?.so_number   ?? nextNumber ?? '',
        order_date:  salesOrder?.order_date ?? salesOrder?.service_date ?? '',
        status:      salesOrder?.status     ?? 'draft',
        notes:           salesOrder?.notes           ?? '',
        items: salesOrder?.items?.map((it: any) => ({
            product_id:     it.product_id,
            quantity:       it.quantity,
            uom:            it.uom            ?? '',
            uom_conversion: it.uom_conversion ?? 1,
            unit_price:     it.unit_price,
            tax_rate:       it.tax_rate       ?? taxRateSo,
            tax_amount:     it.tax_amount     ?? 0,
            subtotal:       it.subtotal       ?? 0,
        })) ?? [emptyItem(taxRateSo)],
    });

    const [pickerIdx, setPickerIdx]                   = useState<number | null>(null);
    const [contractPickerOpen, setContractPickerOpen] = useState(false);

    const selectedContract = contracts?.find((c: any) => String(c.id) === String(data.contract_id));
    const getProduct       = (id: string) => products?.find((p: any) => p.id === id);

    const recalc = (item: any) => {
        const sub  = (item.quantity || 0) * (item.unit_price || 0);
        const rate = item.tax_rate || 0;
        const tax  = rate <= 0 ? 0
            : taxType === 'exclude'
                ? sub * rate / 100
                : sub * rate / (100 + rate);
        return { ...item, subtotal: sub, tax_amount: tax };
    };

    const updateItem = (i: number, field: string, value: any) => {
        const items = [...data.items];
        items[i] = recalc({ ...items[i], [field]: value });
        setData('items', items);
    };

    const handleSelectProduct = (product: any) => {
        if (pickerIdx === null) return;
        const items = [...data.items];
        const cur   = items[pickerIdx];
        items[pickerIdx] = recalc({
            ...cur,
            product_id:     product.id,
            uom:            cur.uom || product.unit || '',
            uom_conversion: cur.uom_conversion || 1,
            unit_price:     cur.unit_price || product.sales_price || product.price || '',
            tax_rate:       cur.tax_rate > 0 ? cur.tax_rate : taxRateSo,
        });
        setData('items', items);
    };

    const handleSelectContract = (contract: any) => {
        const newItems = itemsFromContract(contract, taxRateSo);
        setData({
            ...data,
            contract_id: contract.id,
            customer_id: contract.customer_id ?? data.customer_id,
            items: newItems,
        });
    };

    const addItem    = () => setData('items', [...data.items, emptyItem(taxRateSo)]);
    const removeItem = (i: number) => setData('items', data.items.filter((_: any, idx: number) => idx !== i));

    const subtotalAll = data.items.reduce((s: number, it: any) => s + (it.subtotal   || 0), 0);
    const taxAll      = data.items.reduce((s: number, it: any) => s + (it.tax_amount || 0), 0);
    // exclude: grand = subtotal + tax | include: grand = subtotal (tax embedded)
    const grandTotal  = taxType === 'exclude' ? subtotalAll + taxAll : subtotalAll;
    // include: harga sebelum pajak = subtotal - extracted tax
    const baseAmount  = taxType === 'include'  ? subtotalAll - taxAll : subtotalAll;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/sales-orders/${salesOrder.id}`) : post('/sales-orders');
    };

    return (
        <AppLayout header={editing ? 'Edit Sales Order' : 'Buat Sales Order'}>
            <Head title="Sales Order" />

            {pickerIdx !== null && (
                <ProductPickerModal
                    products={products ?? []}
                    onSelect={handleSelectProduct}
                    onClose={() => setPickerIdx(null)}
                    extraLabel="Harga Jual"
                    extraKey="sales_price"
                    extraFormat="currency"
                />
            )}

            {contractPickerOpen && (
                <ContractPickerModal
                    contracts={contracts ?? []}
                    onSelect={handleSelectContract}
                    onClose={() => setContractPickerOpen(false)}
                />
            )}

            <div className="max-w-5xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    {/* Row 1: No SO, Tgl Order, Status */}
                    <div className="grid grid-cols-3 gap-4">
                        <FormField label="No. SO" error={errors.so_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.so_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Tgl Order" error={errors.order_date} required>
                            <input type="date" className={inputCls} value={data.order_date} onChange={e => setData('order_date', e.target.value)} />
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="confirmed">Dikonfirmasi</option>
                                <option value="completed">Selesai</option>
                                <option value="cancelled">Dibatalkan</option>
                            </select>
                        </FormField>
                    </div>

                    {/* Referensi Kontrak + Customer */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Referensi Kontrak">
                            <button
                                type="button"
                                onClick={() => setContractPickerOpen(true)}
                                className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                            >
                                {selectedContract
                                    ? <span className="text-gray-800">{selectedContract.contract_number}</span>
                                    : <span className="text-gray-400">— Pilih Kontrak —</span>
                                }
                            </button>
                            {selectedContract && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Frekuensi: {selectedContract.visit_frequency}× kunjungan — Item diisi otomatis dari kontrak
                                </p>
                            )}
                        </FormField>
                        <FormField label="Customer">
                            <div className={`${inputCls} bg-gray-50 cursor-default`}>
                                {selectedContract?.customer?.name
                                    ? <span className="text-gray-700">{selectedContract.customer.name}</span>
                                    : <span className="text-gray-400 italic text-xs">Otomatis dari kontrak</span>
                                }
                            </div>
                        </FormField>
                    </div>

                    {/* Item Layanan */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-700">Item Layanan</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-1">
                                PPH: <strong>{taxType === 'exclude' ? 'Tax Exclude' : 'Tax Include'}</strong>
                            </span>
                        </div>
                        <div className="border rounded-lg overflow-x-auto mb-2">
                            <table className="w-full text-sm min-w-[900px]">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-left text-gray-600 text-xs">
                                        <th className="px-3 py-2">Produk</th>
                                        <th className="px-3 py-2 w-20">Qty</th>
                                        <th className="px-3 py-2 w-28">Satuan</th>
                                        <th className="px-3 py-2 w-36">Harga Satuan</th>
                                        <th className="px-3 py-2 w-20 text-center">PPH %</th>
                                        {taxType === 'exclude' && <th className="px-3 py-2 w-28 text-right">PPH (Rp)</th>}
                                        <th className="px-3 py-2 w-36 text-right">Subtotal</th>
                                        <th className="px-3 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.items.length === 0 && (
                                        <tr>
                                            <td colSpan={taxType === 'exclude' ? 8 : 7} className="px-3 py-4 text-center text-gray-400 text-sm">
                                                Belum ada item. Pilih kontrak untuk mengisi otomatis, atau klik "+ Tambah Item".
                                            </td>
                                        </tr>
                                    )}
                                    {data.items.map((item: any, i: number) => {
                                        const selected = getProduct(item.product_id);
                                        return (
                                            <tr key={i} className="align-middle">
                                                <td className="px-3 py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPickerIdx(i)}
                                                        className="w-full text-left px-3 py-1.5 border rounded-md text-sm bg-white hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                                                    >
                                                        {selected
                                                            ? <span className="text-gray-800">{selected.name}</span>
                                                            : <span className="text-gray-400">— Pilih Produk —</span>
                                                        }
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min={1} className={inputCls} value={item.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select className={inputCls} value={item.uom} onChange={e => updateItem(i, 'uom', e.target.value)}>
                                                        <option value="">— Pilih —</option>
                                                        {uoms.map((u: any) => (
                                                            <option key={u.id} value={u.symbol}>{u.symbol} — {u.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min={0} className={inputCls} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', +e.target.value)} placeholder="0" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min={0} max={100} step="0.1" className={inputCls} value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', +e.target.value)} placeholder="0" />
                                                </td>
                                                {taxType === 'exclude' && (
                                                    <td className="px-3 py-2 text-right text-amber-600 text-xs whitespace-nowrap">
                                                        {item.tax_amount > 0 ? fmt(item.tax_amount) : '—'}
                                                    </td>
                                                )}
                                                <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                                                    {fmt(item.subtotal || 0)}
                                                    {taxType === 'include' && item.tax_amount > 0 && (
                                                        <div className="text-xs text-gray-400">PPH: {fmt(item.tax_amount)}</div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
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
                                        <td className="px-3 py-1 text-right text-amber-600">{fmt(taxAll)}</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={taxType === 'exclude' ? 6 : 5} className="px-3 py-2 text-right font-semibold text-gray-700">
                                            {taxType === 'exclude' ? 'Grand Total (incl. PPH)' : 'Total'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-emerald-700 whitespace-nowrap">{fmt(grandTotal)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <button type="button" onClick={addItem} className="text-sm text-emerald-600 hover:underline">+ Tambah Item</button>
                    </div>

                    <FormField label="Catatan">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/sales-orders" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

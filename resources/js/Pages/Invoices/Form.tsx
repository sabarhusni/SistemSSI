import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ContractPickerModal from '@/Components/ContractPickerModal';
import SalesOrderRefPickerModal from '@/Components/SalesOrderRefPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const emptyItem = (month = 1) => ({
    product_id:     '',
    description:    '',
    month,
    quantity:       1,
    uom:            '',
    uom_conversion: 1,
    unit_price:     '',
    tax_rate:       0,
    tax_amount:     0,
    subtotal:       0,
});

// Tax per item mengikuti setting tax_type: exclude → ditambahkan di atas subtotal,
// include → sudah tertanam dalam harga (diekstrak dari subtotal). Sejalan dengan
// pola lineTax() pada SalesOrders/Form.tsx & PurchaseOrders/Form.tsx.
const recalcItem = (item: any, taxType: string) => {
    const sub  = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const rate = Number(item.tax_rate) || 0;
    const tax  = rate <= 0 ? 0 : (taxType === 'exclude' ? sub * rate / 100 : sub * rate / (100 + rate));
    return { ...item, subtotal: sub, tax_amount: tax };
};

const itemFromSO = (it: any, taxType: string) => recalcItem({
    product_id:     it.product_id     ?? '',
    description:    it.product?.name  ?? it.description ?? '',
    month:          Number(it.month) || 1,
    quantity:       Number(it.quantity ?? 1),
    uom:            it.uom            ?? '',
    uom_conversion: it.uom_conversion ?? 1,
    unit_price:     Number(it.unit_price ?? 0),
    tax_rate:       Number(it.tax_rate ?? 0),
}, taxType);

// Bangun item invoice dari item INDUK (jasa) SO untuk tiap bulan yang sudah
// memiliki Work Order berstatus Completed. Qty mengikuti SO (tidak dijumlah antar-visit).
// Produk SO-bulan yang sudah pernah ditagih (invoicedKeys) tidak ditampilkan lagi.
function itemsFromCompletedWOs(so: any, invoicedKeys: string[] = [], taxType: string = 'exclude'): any[] {
    const wos = (so.work_orders ?? []).filter((w: any) => w.status === 'completed');

    // Bulan yang sudah punya WO Completed (diambil dari material WO tsb).
    const completedMonths = new Set<number>();
    for (const wo of wos) {
        for (const mat of (wo.materials ?? [])) {
            completedMonths.add(Number(mat.month) || 1);
        }
    }

    const invoiced = new Set(invoicedKeys);
    const rows = (so.items ?? [])
        .filter((it: any) => !it.parent_product_id && completedMonths.has(Number(it.month) || 1))
        .filter((it: any) => !invoiced.has(`${it.product_id}|${Number(it.month) || 1}`))
        .map((it: any) => itemFromSO(it, taxType))
        .sort((a: any, b: any) => a.month - b.month);

    return rows;
}

export default function Form({ invoice, contracts, products, nextNumber, invoicedKeys = {}, taxType = 'exclude' }: any) {
    const editing = !!invoice;
    // Invoice yang sudah lunas (paid) hanya bisa dilihat, tidak dapat diubah.
    const locked = editing && invoice?.status === 'paid';
    const lockCls = locked ? ' bg-gray-100 cursor-not-allowed' : '';

    const { data, setData, post, put, processing, errors } = useForm<any>({
        contract_id:    invoice?.contract_id    ?? '',
        customer_id:    invoice?.customer_id    ?? '',
        sales_order_id: invoice?.sales_order_id ?? '',
        invoice_number: invoice?.invoice_number ?? nextNumber ?? '',
        invoice_date:   invoice?.invoice_date   ?? '',
        due_date:       invoice?.due_date        ?? '',
        status:         invoice?.status          ?? 'draft',
        notes:          invoice?.notes           ?? '',
        items: invoice?.items?.map((it: any) => itemFromSO(it, taxType)) ?? [emptyItem()],
    });

    const [contractPickerOpen, setContractPickerOpen] = useState(false);
    const [soPickerOpen, setSoPickerOpen] = useState(false);

    const selectedContract = contracts?.find((c: any) => String(c.id) === String(data.contract_id));
    // SO layak tagih (confirmed + ada WO completed) pada kontrak terpilih.
    const invoiceableSOs   = selectedContract?.sales_orders ?? [];
    const linkedSO         = invoiceableSOs.find((s: any) => String(s.id) === String(data.sales_order_id)) ?? null;
    const selectedPremise  = linkedSO?.premise ?? null;
    const getProduct       = (id: string) => products?.find((p: any) => p.id === id);

    // Pilih kontrak: reset SO & item — item terisi setelah SO dipilih.
    const handleSelectContract = (contract: any) => {
        setData({
            ...data,
            contract_id:    contract.id,
            customer_id:    contract.customer_id ?? '',
            sales_order_id: '',
            items:          [],
        });
    };

    // Pilih SO referensi: item invoice terisi dari item induk (jasa) SO untuk bulan ber-WO Completed.
    const handleSelectSO = (so: any) => {
        setData({
            ...data,
            sales_order_id: so.id,
            items:          itemsFromCompletedWOs(so, invoicedKeys?.[so.id] ?? [], taxType),
        });
        setSoPickerOpen(false);
    };

    const subtotalAll = data.items.reduce((s: number, it: any) => s + (it.subtotal   || 0), 0);
    const taxAll      = data.items.reduce((s: number, it: any) => s + (it.tax_amount || 0), 0);
    // exclude: total = subtotal + tax | include: total = subtotal (tax sudah tertanam)
    const grandTotal  = taxType === 'exclude' ? subtotalAll + taxAll : subtotalAll;
    const baseAmount  = taxType === 'include' ? subtotalAll - taxAll : subtotalAll;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (locked) return;
        editing ? put(`/invoices/${invoice.id}`) : post('/invoices');
    };

    return (
        <AppLayout header={locked ? 'View Invoice' : editing ? 'Edit Invoice' : 'Create Invoice'}>
            <Head title="Invoice" />

            {contractPickerOpen && (
                <ContractPickerModal
                    contracts={contracts ?? []}
                    onSelect={handleSelectContract}
                    onClose={() => setContractPickerOpen(false)}
                />
            )}

            {soPickerOpen && (
                <SalesOrderRefPickerModal
                    salesOrders={invoiceableSOs}
                    customerName={selectedContract?.customer?.name}
                    onSelect={handleSelectSO}
                    onClose={() => setSoPickerOpen(false)}
                />
            )}

            <div className="max-w-5xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    {locked && (
                        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                            Invoice ini sudah <span className="font-semibold">Paid</span> sehingga hanya dapat dilihat dan tidak dapat diubah.
                        </div>
                    )}

                    {errors.items && (
                        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {errors.items}
                        </div>
                    )}

                    <div className="grid grid-cols-4 gap-4">
                        <FormField label="Invoice No." error={errors.invoice_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.invoice_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Invoice Date" error={errors.invoice_date} required>
                            <input type="date" className={inputCls + lockCls} value={data.invoice_date} disabled={locked}
                                onChange={e => setData('invoice_date', e.target.value)} />
                        </FormField>
                        <FormField label="Due Date" error={errors.due_date} required>
                            <input type="date" className={inputCls + lockCls} value={data.due_date} disabled={locked}
                                onChange={e => setData('due_date', e.target.value)} />
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls + lockCls} value={data.status} disabled={locked}
                                onChange={e => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                {/* Paid hanya diset otomatis dari modul Payment, tidak bisa dipilih manual.
                                    Tetap tampil (disabled) bila invoice sudah berstatus paid agar nilai tidak hilang saat edit. */}
                                {data.status === 'paid' && <option value="paid" disabled>Paid (otomatis dari pembayaran)</option>}
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </FormField>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <FormField label="Contract Ref.">
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => setContractPickerOpen(true)}
                                className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                {selectedContract
                                    ? <span className="text-gray-800">{selectedContract.contract_number}</span>
                                    : <span className="text-gray-400">— Select Contract —</span>
                                }
                            </button>
                        </FormField>
                        <FormField label="Customer">
                            <div className={`${inputCls} bg-gray-50 cursor-default`}>
                                {selectedContract?.customer?.name
                                    ? <span className="text-gray-700">{selectedContract.customer.name}</span>
                                    : <span className="text-gray-400 italic text-xs">Automatic from contract</span>
                                }
                            </div>
                        </FormField>
                        <FormField label="Referensi SO (Confirmed)" error={errors.sales_order_id}>
                            <button
                                type="button"
                                disabled={!selectedContract || locked}
                                onClick={() => setSoPickerOpen(true)}
                                className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                            >
                                {linkedSO
                                    ? <span className="text-gray-800 font-mono text-xs">{linkedSO.so_number}</span>
                                    : <span className="text-gray-400">{selectedContract ? '— Pilih SO —' : 'Pilih kontrak terlebih dahulu'}</span>
                                }
                            </button>
                        </FormField>
                    </div>

                    {selectedPremise && (
                        <div className="grid grid-cols-3 gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                            <div><span className="text-gray-500 block">Premis Lokasi</span><span className="text-gray-800 font-medium">{selectedPremise.location ?? '—'}</span></div>
                            <div><span className="text-gray-500 block">Premis Alamat</span><span className="text-gray-800 font-medium">{selectedPremise.address ?? '—'}</span></div>
                            <div><span className="text-gray-500 block">Premis PIC</span><span className="text-gray-800 font-medium">{selectedPremise.pic ?? '—'}</span></div>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-700">Invoice Items</h3>
                            <span className="text-xs text-gray-400">Item diambil otomatis dari Sales Order — tidak dapat diubah.</span>
                        </div>
                        <div className="border rounded-lg overflow-x-auto mb-2">
                            <table className="w-full text-sm min-w-[820px]">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-left text-gray-600 text-xs">
                                        <th className="px-3 py-2">Product</th>
                                        <th className="px-3 py-2 w-20 text-center">Bulan</th>
                                        <th className="px-3 py-2 w-20">Qty</th>
                                        <th className="px-3 py-2 w-24">Unit</th>
                                        <th className="px-3 py-2 w-36">Unit Price</th>
                                        <th className="px-3 py-2 w-20 text-center">Tax %</th>
                                        <th className="px-3 py-2 w-36 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.items.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-3 py-4 text-center text-gray-400 text-sm">
                                                {data.sales_order_id
                                                    ? 'Tidak ada produk service yang dapat ditagih — semua bulan sudah ditagih atau belum ada Work Order Completed.'
                                                    : 'Pilih Kontrak lalu Referensi SO untuk mengisi item otomatis.'}
                                            </td>
                                        </tr>
                                    )}
                                    {data.items.map((item: any, i: number) => {
                                        const selected = getProduct(item.product_id);
                                        const displayName = selected?.name ?? item.description;
                                        return (
                                            <tr key={i} className="align-middle">
                                                <td className="px-3 py-2">
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="w-full text-left px-3 py-1.5 border rounded-md text-sm bg-gray-100 cursor-not-allowed transition"
                                                    >
                                                        {displayName
                                                            ? <span className="text-gray-800">{displayName}</span>
                                                            : <span className="text-gray-400">—</span>
                                                        }
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" disabled readOnly
                                                        className={inputCls + ' text-center bg-gray-100 cursor-not-allowed'}
                                                        value={item.month ?? 1} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" disabled readOnly
                                                        className={inputCls + ' bg-gray-100 cursor-not-allowed'}
                                                        value={item.quantity} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input disabled readOnly
                                                        className={inputCls + ' bg-gray-100 cursor-not-allowed'}
                                                        value={item.uom} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" disabled readOnly
                                                        className={inputCls + ' bg-gray-100 cursor-not-allowed'}
                                                        value={item.unit_price} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" disabled readOnly
                                                        className={inputCls + ' bg-gray-100 cursor-not-allowed'}
                                                        value={item.tax_rate} />
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                                                    {fmt(item.subtotal || 0)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t text-sm">
                                    <tr>
                                        <td colSpan={6} className="px-3 py-2 text-right text-gray-600">{taxType === 'include' ? 'Pre-Tax Amount' : 'Subtotal'}</td>
                                        <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{fmt(baseAmount)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={6} className="px-3 py-2 text-right text-gray-600">Tax Amount</td>
                                        <td className="px-3 py-2 text-right text-amber-600 whitespace-nowrap">{fmt(taxAll)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={6} className="px-3 py-2 text-right font-semibold text-gray-700">{taxType === 'exclude' ? 'Grand Total (incl. Tax)' : 'Total'}</td>
                                        <td className="px-3 py-2 text-right font-bold text-emerald-700 whitespace-nowrap">{fmt(grandTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <FormField label="Notes">
                        <textarea rows={2} className={inputCls + lockCls} value={data.notes} disabled={locked}
                            onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        {!locked && (
                            <button type="submit" disabled={processing}
                                className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                                {processing ? 'Saving...' : 'Save'}
                            </button>
                        )}
                        <Link href="/invoices"
                            className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                            {locked ? 'Back' : 'Cancel'}
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

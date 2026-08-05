import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ContractPickerModal from '@/Components/ContractPickerModal';
import WorkOrderRefPickerModal from '@/Components/WorkOrderRefPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { Fragment, useMemo, useState } from 'react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const emptyItem = (month = 1) => ({
    product_id:     '',
    description:    '',
    month,
    work_order_id:     null,
    premise_location:  '',
    premise_address:   '',
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
    work_order_id:    it.work_order_id    ?? null,
    premise_location: it.premise_location ?? '',
    premise_address:  it.premise_address  ?? '',
    quantity:       Number(it.quantity ?? 1),
    uom:            it.uom            ?? '',
    uom_conversion: it.uom_conversion ?? 1,
    unit_price:     Number(it.unit_price ?? 0),
    tax_rate:       Number(it.tax_rate ?? 0),
}, taxType);

// Baris ringkasan invoice untuk kontrak pest hama unik: nilai diambil dari input
// "Nilai Tagihan" (bukan dijumlah dari item Sales Order).
const pestUnikItem = (nilaiTagihan: number, contract: any, taxType: string) => recalcItem({
    product_id:     '',
    description:    `Jasa Pest Control - ${contract?.contract_number ?? ''}`,
    month:          1,
    work_order_id:    null,
    premise_location: '',
    premise_address:  '',
    quantity:       1,
    uom:            '',
    uom_conversion: 1,
    unit_price:     nilaiTagihan,
    tax_rate:       0,
}, taxType);

// Bangun item invoice dari item INDUK (jasa) SO milik masing-masing WO terpilih —
// satu WorkOrder = satu SO + satu bulan/visit, jadi bulan yang dicari langsung dari
// wo.month (bukan lagi dari WorkOrderMaterial). Qty mengikuti SO (tidak dijumlah
// antar-visit). Produk SO-bulan yang sudah pernah ditagih (invoicedKeys) tidak
// ditampilkan lagi. excludeSoMonthKeys men-dedupe terhadap item yang sudah ada
// (mis. WO redo yang merujuk visit bulan yang sama dengan WO lain yang sudah dipilih).
function itemsFromSelectedWOs(
    selectedWoIds: string[],
    invoiceableWos: any[],
    invoicedKeys: Record<string, string[]> = {},
    taxType: string = 'exclude',
    excludeSoMonthKeys: Set<string> = new Set(),
): any[] {
    const seen = new Set(excludeSoMonthKeys);
    const rows: any[] = [];

    for (const woId of selectedWoIds) {
        const wo = invoiceableWos.find((w: any) => w.id === woId);
        if (!wo) continue;

        const month = Number(wo.month) || 1;
        const key   = `${wo.sales_order_id}|${month}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const invoiced = new Set(invoicedKeys?.[wo.sales_order_id] ?? []);
        const soItems = (wo._so?.items ?? []).filter(
            (it: any) => !it.parent_product_id && (Number(it.month) || 1) === month
                && !invoiced.has(`${it.product_id}|${month}`)
        );
        soItems.forEach((it: any) => rows.push({
            ...itemFromSO(it, taxType),
            work_order_id:    wo.id,
            premise_location: wo.premise?.location ?? '',
            premise_address:  wo.premise?.address  ?? '',
        }));
    }

    return rows.sort((a: any, b: any) => a.month - b.month);
}

export default function Form({ invoice, contracts, products, nextNumber, invoicedKeys = {}, taxType = 'exclude', invoicedTotalsByContract = {} }: any) {
    const editing = !!invoice;
    // Invoice yang sudah lunas (paid) hanya bisa dilihat, tidak dapat diubah.
    const locked = editing && invoice?.status === 'paid';
    const lockCls = locked ? ' bg-gray-100 cursor-not-allowed' : '';

    const { data, setData, post, put, processing, errors } = useForm<any>({
        contract_id:     invoice?.contract_id     ?? '',
        customer_id:     invoice?.customer_id     ?? '',
        work_order_ids:  invoice?.work_orders?.map((w: any) => w.id) ?? [],
        invoice_number: invoice?.invoice_number ?? nextNumber ?? '',
        invoice_date:   invoice?.invoice_date   ?? '',
        due_date:       invoice?.due_date        ?? '',
        status:         invoice?.status          ?? 'draft',
        notes:          invoice?.notes           ?? '',
        items: invoice?.items?.map((it: any) => itemFromSO(it, taxType)) ?? [emptyItem()],
    });

    const [contractPickerOpen, setContractPickerOpen] = useState(false);
    const [woPickerOpen, setWoPickerOpen] = useState(false);

    const selectedContract = contracts?.find((c: any) => String(c.id) === String(data.contract_id));
    const getProduct       = (id: string) => products?.find((p: any) => p.id === id);

    // WO layak tagih (completed) pada kontrak terpilih, di-flatten dari tiap SO
    // beserta info SO/premis induknya — dipakai picker & derivasi item.
    const invoiceableWos = useMemo(() => {
        const rows: any[] = [];
        (selectedContract?.sales_orders ?? []).forEach((so: any) => {
            (so.work_orders ?? []).forEach((wo: any) => {
                rows.push({ ...wo, so_number: so.so_number, premise: so.premise, sales_order_id: so.id, _so: so });
            });
        });
        return rows;
    }, [selectedContract]);

    const linkedWos = invoiceableWos.filter((w: any) => data.work_order_ids.includes(w.id));

    // Kontrak pest hama unik: nilai invoice diambil dari nilai kontrak, bukan item SO.
    const isUniquePest    = selectedContract?.service_type === 'pest_control' && !!selectedContract?.is_unique_pest;
    const alreadyInvoiced = Number(invoicedTotalsByContract?.[selectedContract?.id]) || 0;
    const remainingBalance = Math.max(0, (Number(selectedContract?.contract_value) || 0) - alreadyInvoiced);

    // Pilih kontrak: reset WO & item. Kontrak pest hama unik langsung menghasilkan
    // 1 baris ringkasan senilai sisa kontrak — tidak perlu memilih referensi apa pun.
    // Kontrak biasa: item terisi setelah WO dipilih.
    const handleSelectContract = (contract: any) => {
        const uniquePest = contract.service_type === 'pest_control' && !!contract.is_unique_pest;
        const invoicedTotal = Number(invoicedTotalsByContract?.[contract.id]) || 0;
        const remaining     = Math.max(0, (Number(contract.contract_value) || 0) - invoicedTotal);

        setData({
            ...data,
            contract_id:    contract.id,
            customer_id:    contract.customer_id ?? '',
            work_order_ids: [],
            items:          uniquePest ? [pestUnikItem(remaining, contract, taxType)] : [],
        });
    };

    // Konfirmasi Referensi No WO (multi-select, kontrak normal saja — kontrak pest
    // hama unik tidak menampilkan picker ini sama sekali): item untuk WO yang masih
    // terpilih dipertahankan, item baru ditambahkan dari WO yang baru dipilih.
    const handleConfirmWOs = (ids: string[]) => {
        const keep = data.items.filter((it: any) => it.work_order_id && ids.includes(it.work_order_id));
        const keptSoMonthKeys = new Set<string>(
            keep.map((it: any) => {
                const wo = invoiceableWos.find((w: any) => w.id === it.work_order_id);
                return wo ? `${wo.sales_order_id}|${Number(wo.month) || 1}` : null;
            }).filter((k: string | null): k is string => k !== null)
        );
        const newIds = ids.filter((id: string) => !data.work_order_ids.includes(id));
        const added  = itemsFromSelectedWOs(newIds, invoiceableWos, invoicedKeys, taxType, keptSoMonthKeys);

        setData({ ...data, work_order_ids: ids, items: [...keep, ...added] });
        setWoPickerOpen(false);
    };

    const handleNilaiTagihanChange = (value: number) => {
        setData('items', [recalcItem({ ...(data.items[0] ?? {}), unit_price: value }, taxType)]);
    };

    // Grouping tampilan item per premis (Lokasi + Alamat) — header ditampilkan sekali
    // per grup, baris item di bawahnya tidak mengulang kolom Lokasi/Alamat.
    const premiseGroups = useMemo(() => {
        const map = new Map<string, { location: string; address: string; rows: { item: any; idx: number }[] }>();
        data.items.forEach((item: any, idx: number) => {
            const key = `${item.premise_location || ''}|${item.premise_address || ''}`;
            if (!map.has(key)) map.set(key, { location: item.premise_location, address: item.premise_address, rows: [] });
            map.get(key)!.rows.push({ item, idx });
        });
        return Array.from(map.values());
    }, [data.items]);

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

            {!isUniquePest && woPickerOpen && (
                <WorkOrderRefPickerModal
                    workOrders={invoiceableWos}
                    customerName={selectedContract?.customer?.name}
                    selectedIds={data.work_order_ids}
                    onConfirm={handleConfirmWOs}
                    onClose={() => setWoPickerOpen(false)}
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
                        {!isUniquePest && (
                            <FormField label="Referensi No WO (Completed)" error={errors.work_order_ids}>
                                <button
                                    type="button"
                                    disabled={!selectedContract || locked}
                                    onClick={() => setWoPickerOpen(true)}
                                    className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                                >
                                    {linkedWos.length > 0
                                        ? <span className="text-gray-800 font-mono text-xs">{linkedWos.map((w: any) => w.wo_number).join(', ')}</span>
                                        : <span className="text-gray-400">{selectedContract ? '— Pilih WO —' : 'Pilih kontrak terlebih dahulu'}</span>
                                    }
                                </button>
                            </FormField>
                        )}
                    </div>

                    {isUniquePest && (
                        <div className="grid grid-cols-3 gap-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
                            <FormField label="Total Nilai Kontrak">
                                <div className={`${inputCls} bg-white`}>{fmt(Number(selectedContract?.contract_value) || 0)}</div>
                            </FormField>
                            <FormField label="Sudah Ditagih Sebelumnya">
                                <div className={`${inputCls} bg-white`}>{fmt(alreadyInvoiced)}</div>
                            </FormField>
                            <FormField label="Nilai Tagihan" required>
                                <input type="number" className={inputCls + lockCls} disabled={locked || !data.items[0]}
                                    value={data.items[0]?.unit_price ?? ''}
                                    onChange={e => handleNilaiTagihanChange(+e.target.value || 0)} />
                            </FormField>
                        </div>
                    )}

                    {!isUniquePest && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-700">Invoice Items</h3>
                                <span className="text-xs text-gray-400">
                                    Item diambil otomatis dari Work Order — tidak dapat diubah.
                                </span>
                            </div>
                            <div className="border rounded-lg overflow-x-auto mb-2">
                                <table className="w-full text-sm min-w-[820px]">
                                    <thead className="bg-gray-50 border-b">
                                        <tr className="text-left text-gray-600 text-xs">
                                            <th className="px-3 py-2">Product</th>
                                            <th className="px-3 py-2 w-24 text-center">Visit ke</th>
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
                                                    {data.work_order_ids.length > 0
                                                        ? 'Tidak ada produk service yang dapat ditagih — semua bulan sudah ditagih.'
                                                        : 'Pilih Kontrak lalu Referensi No WO untuk mengisi item otomatis.'}
                                                </td>
                                            </tr>
                                        )}
                                        {premiseGroups.map((group, gi) => (
                                            <Fragment key={`grp-${gi}`}>
                                                <tr className="bg-gray-100">
                                                    <td colSpan={7} className="px-3 py-1.5 text-xs font-semibold text-gray-600">
                                                        {group.location || '—'}{group.address ? ` — ${group.address}` : ''}
                                                    </td>
                                                </tr>
                                                {group.rows.map(({ item, idx }) => {
                                                    const selected = getProduct(item.product_id);
                                                    const displayName = selected?.name ?? item.description;
                                                    return (
                                                        <tr key={idx} className="align-middle">
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
                                                            <td className="px-3 py-2 text-center text-xs text-gray-600 whitespace-nowrap">
                                                                Visit ke-{item.month ?? 1}
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
                                            </Fragment>
                                        ))}
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
                    )}

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

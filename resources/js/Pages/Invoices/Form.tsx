import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ContractPickerModal from '@/Components/ContractPickerModal';
import WorkOrderRefPickerModal from '@/Components/WorkOrderRefPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { Fragment, useEffect, useMemo, useState } from 'react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const serviceTypeLabel = (v: string) => v === 'pest_control' ? 'U-Pest' : v === 'scenting' ? 'U-Scent' : '—';

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

// Item invoice tersimpan: nama produk diambil dari description (bisa sudah diubah
// khusus untuk invoice ini), fallback ke nama master produk untuk data lama.
const itemFromInvoice = (it: any, taxType: string) => ({
    ...itemFromSO(it, taxType),
    description: it.description || it.product?.name || '',
});

// Baris ringkasan invoice untuk kontrak pest hama unik: nilai diambil dari input
// "Nilai Tagihan" (bukan dijumlah dari item Sales Order).
const pestUnikItem = (nilaiTagihan: number, contract: any, taxType: string) => recalcItem({
    product_id:     '',
    description:    `Jasa U-Pest - ${contract?.contract_number ?? ''}`,
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

// Perkiraan nomor dokumen [NNNN]/[UP|US]-[KIND]/[MMYYYY]; nomor final dibuat server saat simpan.
const previewDocNumber = (seq: number, serviceType: string | undefined, kind: 'SSI' | 'INV') => {
    if (!seq || !serviceType) return 'Otomatis';
    const now = new Date();
    const period = String(now.getMonth() + 1).padStart(2, '0') + now.getFullYear();
    return `${String(seq).padStart(4, '0')}/${serviceType === 'scenting' ? 'US' : 'UP'}-${kind}/${period}`;
};

export default function Form({ invoice, contracts, products, nextSequence = 0, invoicedKeys = {}, taxType = 'exclude', invoicedTotalsByContract = {}, invoiceCountByContract = {}, billingMethodByContract = {} }: any) {
    const editing = !!invoice;
    // Invoice yang sudah lunas (paid) hanya bisa dilihat, tidak dapat diubah.
    const locked = editing && invoice?.status === 'paid';
    const lockCls = locked ? ' bg-gray-100 cursor-not-allowed' : '';

    const { data, setData, post, put, processing, errors } = useForm<any>({
        contract_id:     invoice?.contract_id     ?? '',
        billing_method:  invoice?.billing_method  ?? 'wo_reference',
        customer_id:     invoice?.customer_id     ?? '',
        customer_name:   invoice?.customer_name   ?? invoice?.customer?.name ?? '',
        billing_pic_name:     invoice?.billing_pic_name     ?? '',
        billing_pic_position: invoice?.billing_pic_position ?? '',
        billing_pic_email:    invoice?.billing_pic_email    ?? '',
        billing_pic_phone:    invoice?.billing_pic_phone    ?? '',
        billing_pic_address:  invoice?.billing_pic_address  ?? '',
        work_order_ids:  invoice?.work_orders?.map((w: any) => w.id) ?? [],
        invoice_date:   invoice?.invoice_date   ?? '',
        due_date:       invoice?.due_date        ?? '',
        status:         invoice?.status          ?? 'draft',
        notes:          invoice?.notes           ?? '',
        items: invoice?.items?.map((it: any) => itemFromInvoice(it, taxType)) ?? [emptyItem()],
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

    // Kontrak pest hama unik: nilai invoice diambil dari nilai kontrak, bukan item SO —
    // tidak ada pilihan metode tagihan (selalu Nilai Kontrak). Kontrak lain boleh memilih
    // antara Referensi WO (skema lama) atau Nilai Kontrak (input manual, sama seperti
    // hama unik) lewat data.billing_method.
    const isUniquePest      = selectedContract?.service_type === 'pest_control' && !!selectedContract?.is_unique_pest;
    const usesContractValue = isUniquePest || data.billing_method === 'contract_value';
    // Metode tagihan invoice ke-2 dst pada satu kontrak mengikuti invoice pertama
    // kontrak tersebut (dikirim dari backend) — tidak bisa diubah lagi.
    const establishedBillingMethod = billingMethodByContract?.[selectedContract?.id] ?? null;
    const billingMethodLocked = !!establishedBillingMethod;
    const alreadyInvoiced = Number(invoicedTotalsByContract?.[selectedContract?.id]) || 0;
    const remainingBalance = Math.max(0, (Number(selectedContract?.contract_value) || 0) - alreadyInvoiced);

    // Posisi termin invoice ini terhadap Invoice Term Frequency kontrak (dihitung dari
    // jumlah invoice non-cancelled lain pada kontrak yang sama + invoice ini sendiri).
    const invoiceFrequency     = Number(selectedContract?.invoice_frequency) || 0;
    const existingInvoiceCount = Number(invoiceCountByContract?.[selectedContract?.id]) || 0;
    const invoicePosition      = existingInvoiceCount + 1;
    const isLastTerm           = invoiceFrequency > 0 && invoicePosition === invoiceFrequency;
    const exceedsTermFrequency = invoiceFrequency > 0 && invoicePosition > invoiceFrequency;

    // Termin terakhir + Nilai Kontrak: Nilai Tagihan dikunci ke sisa nilai kontrak persis
    // (tidak bisa ditagih nilai lain), supaya total seluruh invoice pas sama dengan Nilai Kontrak.
    useEffect(() => {
        if (!usesContractValue || !isLastTerm) return;
        const current = Number(data.items[0]?.unit_price) || 0;
        if (Math.abs(current - remainingBalance) > 0.01) {
            setData('items', [recalcItem({ ...(data.items[0] ?? {}), unit_price: remainingBalance }, taxType)]);
        }
    }, [usesContractValue, isLastTerm, remainingBalance]);

    // Pilih kontrak: reset WO, item, & metode tagihan. Kontrak pest hama unik langsung
    // menghasilkan 1 baris ringkasan senilai sisa kontrak. Kontrak lain default ke
    // Referensi WO (skema lama) — bisa diganti ke Nilai Kontrak lewat toggle di bawah.
    const handleSelectContract = (contract: any) => {
        const uniquePest = contract.service_type === 'pest_control' && !!contract.is_unique_pest;
        const established = billingMethodByContract?.[contract.id] ?? null;
        const invoicedTotal = Number(invoicedTotalsByContract?.[contract.id]) || 0;
        const remaining     = Math.max(0, (Number(contract.contract_value) || 0) - invoicedTotal);
        const method = uniquePest ? 'contract_value' : (established ?? 'wo_reference');

        setData({
            ...data,
            contract_id:    contract.id,
            billing_method: method,
            customer_id:    contract.customer_id ?? '',
            customer_name:  contract.customer?.name ?? '',
            billing_pic_name:     contract.customer?.billing_pic_name     ?? '',
            billing_pic_position: contract.customer?.billing_pic_position ?? '',
            billing_pic_email:    contract.customer?.billing_pic_email    ?? '',
            billing_pic_phone:    contract.customer?.billing_pic_phone    ?? '',
            billing_pic_address:  contract.customer?.billing_pic_address  ?? '',
            work_order_ids: [],
            items:          method === 'contract_value' ? [pestUnikItem(remaining, contract, taxType)] : [],
        });
    };

    // Ganti metode tagihan (hanya tersedia untuk kontrak selain pest hama unik).
    const handleChangeBillingMethod = (method: 'wo_reference' | 'contract_value') => {
        setData({
            ...data,
            billing_method: method,
            work_order_ids: [],
            items: method === 'contract_value' ? [pestUnikItem(remainingBalance, selectedContract, taxType)] : [],
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

    // Nama produk service hanya diubah di invoice ini — master produk tidak berubah.
    const handleItemNameChange = (idx: number, value: string) => {
        setData('items', data.items.map((it: any, i: number) => i === idx ? { ...it, description: value } : it));
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

            {!usesContractValue && woPickerOpen && (
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
                        <FormField label="Invoice No.">
                            <input className={inputCls + ' bg-gray-50'} readOnly tabIndex={-1}
                                value={invoice?.invoice_number ?? previewDocNumber(nextSequence, selectedContract?.service_type, 'INV')} />
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

                    <div className="grid grid-cols-2 gap-2">
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
                        <FormField label="Customer" error={errors.customer_name}>
                            <input
                                className={inputCls + (locked || !selectedContract ? ' bg-gray-100 cursor-not-allowed' : '')}
                                value={data.customer_name}
                                onChange={e => setData('customer_name', e.target.value)}
                                disabled={locked || !selectedContract}
                                placeholder="Automatic from contract"
                            />
                            {selectedContract && !locked && (
                                <p className="text-xs text-gray-400 mt-1">Hanya mengubah nama di invoice ini, data master customer tidak berubah.</p>
                            )}
                        </FormField>
                    </div>

                    {selectedContract && (
                        <div className="border rounded-md p-3 bg-gray-50/50">
                            <p className="text-xs font-semibold text-gray-600 mb-2">
                                PIC Penagihan <span className="font-normal text-gray-400">— dari customer, bisa diubah khusus untuk invoice ini</span>
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                                {([
                                    ['billing_pic_name', 'Name', 'text'],
                                    ['billing_pic_position', 'Position', 'text'],
                                    ['billing_pic_email', 'Email', 'email'],
                                    ['billing_pic_phone', 'Phone', 'text'],
                                ] as const).map(([key, label, type]) => (
                                    <FormField key={key} label={label} error={errors[key]}>
                                        <input
                                            type={type}
                                            className={inputCls + lockCls}
                                            value={data[key]}
                                            onChange={e => setData(key, e.target.value)}
                                            disabled={locked}
                                        />
                                    </FormField>
                                ))}
                            </div>
                            <div className="mt-2">
                                <FormField label="Address" error={errors.billing_pic_address}>
                                    <textarea
                                        rows={2}
                                        className={inputCls + lockCls}
                                        value={data.billing_pic_address}
                                        onChange={e => setData('billing_pic_address', e.target.value)}
                                        disabled={locked}
                                    />
                                </FormField>
                            </div>
                        </div>
                    )}

                    {selectedContract && (
                        <div className="grid grid-cols-2 gap-2">
                            <FormField label="Jenis Services">
                                <div className={`${inputCls} bg-gray-50 cursor-default`}>
                                    <span className="text-gray-700">{serviceTypeLabel(selectedContract.service_type)}</span>
                                </div>
                            </FormField>
                            <FormField label="Status Hama Unik">
                                <div className={`${inputCls} bg-gray-50 cursor-default`}>
                                    {selectedContract.service_type === 'pest_control'
                                        ? <span className={isUniquePest ? 'text-emerald-700 font-medium' : 'text-gray-700'}>{isUniquePest ? 'Ya (Hama Unik)' : 'Tidak'}</span>
                                        : <span className="text-gray-400 italic text-xs">Tidak berlaku (bukan U-Pest)</span>
                                    }
                                </div>
                            </FormField>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {selectedContract && !isUniquePest && (
                            <FormField label="Metode Tagihan" error={errors.billing_method}>
                                <div className="flex gap-6">
                                    {[{ val: 'wo_reference', label: 'Referensi WO' }, { val: 'contract_value', label: 'Nilai Kontrak' }].map(opt => (
                                        <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="billing_method"
                                                value={opt.val}
                                                disabled={locked || billingMethodLocked}
                                                checked={data.billing_method === opt.val}
                                                onChange={() => handleChangeBillingMethod(opt.val as 'wo_reference' | 'contract_value')}
                                                className="w-4 h-4 text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-sm text-gray-700">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {billingMethodLocked && !locked && (
                                    <p className="text-xs text-gray-500 mt-1">Mengikuti metode tagihan invoice pertama kontrak ini, tidak dapat diubah.</p>
                                )}
                            </FormField>
                        )}

                        {!usesContractValue && (
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



                    {selectedContract && invoiceFrequency > 0 && (
                        <div className="grid grid-cols-3 gap-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-3">
                            <div>
                                <span className="text-gray-500 block text-xs">Invoice Term Frequency</span>
                                <span className="font-medium text-gray-800 text-sm">{invoiceFrequency} termin</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs">Termin Invoice Ini</span>
                                <span className="font-medium text-gray-800 text-sm">Ke-{invoicePosition} dari {invoiceFrequency}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs">Sisa Termin Setelah Invoice Ini</span>
                                <span className="font-medium text-gray-800 text-sm">{Math.max(0, invoiceFrequency - invoicePosition)} termin</span>
                            </div>
                        </div>
                    )}

                    {exceedsTermFrequency && (
                        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            Jumlah invoice untuk kontrak ini sudah mencapai batas Invoice Term Frequency ({invoiceFrequency}). Invoice ini tidak dapat disimpan.
                        </div>
                    )}
                    {isLastTerm && !exceedsTermFrequency && (
                        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                            Ini adalah invoice termin terakhir (ke-{invoiceFrequency} dari Invoice Term Frequency kontrak).{' '}
                            {usesContractValue
                                ? 'Nilai Tagihan otomatis dikunci ke sisa nilai kontrak.'
                                : 'SEMUA Work Order pada kontrak ini harus berstatus Completed sebelum invoice dapat disimpan.'}
                        </div>
                    )}

                    {usesContractValue && (
                        <div className="grid grid-cols-3 gap-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
                            <FormField label="Total Nilai Kontrak">
                                <div className={`${inputCls} bg-white`}>{fmt(Number(selectedContract?.contract_value) || 0)}</div>
                            </FormField>
                            <FormField label="Sudah Ditagih Sebelumnya">
                                <div className={`${inputCls} bg-white`}>{fmt(alreadyInvoiced)}</div>
                            </FormField>
                            <FormField label="Nilai Tagihan" required>
                                <input type="number" className={inputCls + lockCls} disabled={locked || !data.items[0] || isLastTerm}
                                    value={data.items[0]?.unit_price ?? ''}
                                    onChange={e => handleNilaiTagihanChange(+e.target.value || 0)} />
                                {isLastTerm && (
                                    <p className="text-xs text-amber-700 mt-1">Termin terakhir — nilai tagihan dikunci ke sisa nilai kontrak, tidak dapat diubah.</p>
                                )}
                            </FormField>
                        </div>
                    )}

                    {!usesContractValue && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-700">Invoice Items</h3>
                                <span className="text-xs text-gray-400">
                                    Item diambil otomatis dari Work Order — hanya nama produk yang dapat diubah (master produk tidak berubah).
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
                                                    const masterName = getProduct(item.product_id)?.name;
                                                    return (
                                                        <tr key={idx} className="align-middle">
                                                            <td className="px-3 py-2">
                                                                <input
                                                                    className={inputCls + lockCls}
                                                                    value={item.description ?? ''}
                                                                    placeholder={masterName ?? ''}
                                                                    disabled={locked}
                                                                    maxLength={255}
                                                                    onChange={e => handleItemNameChange(idx, e.target.value)}
                                                                />
                                                                {masterName && item.description && item.description !== masterName && (
                                                                    <p className="text-[11px] text-gray-400 mt-0.5">Master: {masterName}</p>
                                                                )}
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
                            <button type="submit" disabled={processing || exceedsTermFrequency}
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

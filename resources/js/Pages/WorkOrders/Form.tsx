import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ProductPickerModal from '@/Components/ProductPickerModal';
import ContractPickerModal from '@/Components/ContractPickerModal';
import SalesOrderRefPickerModal from '@/Components/SalesOrderRefPickerModal';
import SalesOrderItemPickerModal from '@/Components/SalesOrderItemPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';

const VISIT_TYPES = [
    { value: 'routine',   label: 'Routine' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'followup',  label: 'Follow Up' },
];

const emptySub = () => ({ product_id: '', quantity_used: 1, uom: '' });

const emptyMaterial = (month = 1) => ({
    product_id:   '',
    month,
    uom:          '',
    quantity_used: 1,
    sub_products: [] as any[],
});

const round2 = (n: number) => Math.round(n * 100) / 100;

// Tanggal visit plan SO yang jatuh pada bulan kontrak tertentu (bulan 1 = bulan start_date).
function visitDatesForMonth(visitPlans: any[], contract: any, month: number): any[] {
    const dated = (visitPlans ?? []).filter((v: any) => v.visit_date);
    const start = contract?.start_date;
    if (!start) return dated;
    const duration = Number(contract?.duration_months) > 0 ? Number(contract.duration_months) : 1;
    return dated.filter((v: any) => contractMonthOf(start, v.visit_date, duration) === month);
}

// Susun material used dari satu item service SO (parent) untuk bulan item tersebut.
// Qty tiap sub-produk dibagi jumlah tanggal visit plan SO pada bulan itu.
function materialsFromSoItem(item: any, soItems: any[], visitPlans: any[], contract: any): any[] {
    if (!item) return [];
    const month   = Number(item.month) || 1;
    const subs    = (soItems ?? []).filter(
        (it: any) => it.parent_product_id === item.product_id && (Number(it.month) || 1) === month
    );
    const visits  = visitDatesForMonth(visitPlans, contract, month).length;
    const divisor = visits > 0 ? visits : 1;

    return [{
        product_id:    item.product_id,
        month,
        uom:           item.uom ?? item.product?.unit ?? '',
        quantity_used: Number(item.quantity) || 1,
        sub_products: subs.map((sp: any) => ({
            product_id:    sp.product_id,
            uom:           sp.uom ?? sp.product?.unit ?? '',
            quantity_used: round2((Number(sp.quantity) || 0) / divisor),
        })),
    }];
}

// Rekonstruksi struktur bersarang dari baris flat work_order_materials saat edit.
function materialsFromRows(rows: any[]): any[] {
    if (!rows?.length) return [];

    const parents = rows.filter((r: any) => !r.parent_product_id);
    const children = rows.filter((r: any) => r.parent_product_id);

    return parents.map((p: any) => ({
        product_id:    p.product_id,
        month:         p.month ?? 1,
        uom:           p.uom ?? '',
        quantity_used: p.quantity_used,
        sub_products: children
            .filter((c: any) => c.parent_product_id === p.product_id && (c.month ?? 1) === (p.month ?? 1))
            .map((c: any) => ({ product_id: c.product_id, quantity_used: c.quantity_used, uom: c.uom ?? '' })),
    }));
}

// Ratakan struktur bersarang menjadi baris flat untuk disimpan.
function flattenMaterials(materials: any[]): any[] {
    const map = new Map<string, any>();
    const push = (row: any) => {
        const key = `${row.product_id}-${row.month}-${row.parent_product_id ?? ''}`;
        const existing = map.get(key);
        if (existing) {
            existing.quantity_used = Number(existing.quantity_used || 0) + Number(row.quantity_used || 0);
        } else {
            map.set(key, row);
        }
    };

    for (const m of materials) {
        if (!m.product_id) continue;
        const month = Number(m.month) || 1;
        push({
            product_id:        m.product_id,
            parent_product_id: null,
            month,
            uom:               m.uom ?? null,
            quantity_used:     Number(m.quantity_used || 1),
        });
        for (const sub of (m.sub_products ?? [])) {
            if (!sub.product_id) continue;
            push({
                product_id:        sub.product_id,
                parent_product_id: m.product_id,
                month,
                uom:               sub.uom ?? null,
                quantity_used:     Number(sub.quantity_used || 1),
            });
        }
    }

    return Array.from(map.values());
}

// Petakan tanggal visit ke nomor bulan kontrak (bulan 1 = bulan start_date).
function contractMonthOf(start: string, date: string, duration: number): number {
    const s = new Date(start), d = new Date(date);
    let diff = (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()) + 1;
    if (diff < 1) diff = 1;
    if (diff > duration) diff = duration;
    return diff;
}

export default function Form({ workOrder, technicians, products, contracts, nextNumber, locked = false }: any) {
    const editing = !!workOrder;

    const { data, setData, post, put, transform, processing, errors } = useForm<any>({
        contract_id:         workOrder?.contract_id         ?? '',
        sales_order_id:      workOrder?.sales_order_id      ?? '',
        sales_order_item_id: workOrder?.sales_order_item_id ?? '',
        technician_id:    workOrder?.technician_id    ?? '',
        wo_number:        workOrder?.wo_number        ?? nextNumber ?? '',
        visit_date:       workOrder?.visit_date        ?? '',
        // Kolom time Postgres terbawa "HH:MM:SS"; input type=time & validasi pakai HH:MM.
        time_in:          (workOrder?.time_in  ?? '').slice(0, 5),
        time_out:         (workOrder?.time_out ?? '').slice(0, 5),
        service_area:     workOrder?.service_area      ?? '',
        visit_types:      workOrder?.visit_types       ?? [],
        status:           workOrder?.status            ?? 'pending',
        technician_notes: workOrder?.technician_notes  ?? '',
        materials:        editing ? materialsFromRows(workOrder.materials ?? []) : [],
    });

    const [pickerTarget, setPickerTarget] = useState<{ matIdx: number; subIdx?: number } | null>(null);
    const [contractPickerOpen, setContractPickerOpen] = useState(false);
    const [soPickerOpen, setSoPickerOpen] = useState(false);
    const [soItemPickerOpen, setSoItemPickerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

    const getProduct = (id: string) => products?.find((p: any) => p.id === id);
    const productUnit = (p: any) => p?.unit ?? '';
    const setMaterials = (materials: any[]) => setData('materials', materials);
    const toggleMonth = (month: number) => setCollapsed(c => ({ ...c, [month]: !c[month] }));

    const updateMaterial = (i: number, field: string, value: any) => {
        const m = [...data.materials];
        m[i] = { ...m[i], [field]: value };
        setMaterials(m);
    };
    const addMaterialToMonth = (month: number) => setMaterials([...data.materials, emptyMaterial(month)]);
    const addPeriod = () => {
        const maxMonth = data.materials.reduce((mx: number, m: any) => Math.max(mx, Number(m.month) || 0), 0);
        addMaterialToMonth(maxMonth + 1);
    };
    const removeMaterial = (i: number) => setMaterials(data.materials.filter((_: any, idx: number) => idx !== i));

    const addSubProduct = (matIdx: number) => {
        const m = [...data.materials];
        m[matIdx] = { ...m[matIdx], sub_products: [...(m[matIdx].sub_products ?? []), emptySub()] };
        setMaterials(m);
    };
    const updateSubProduct = (matIdx: number, subIdx: number, field: string, value: any) => {
        const m = [...data.materials];
        const subs = [...(m[matIdx].sub_products ?? [])];
        subs[subIdx] = { ...subs[subIdx], [field]: value };
        m[matIdx] = { ...m[matIdx], sub_products: subs };
        setMaterials(m);
    };
    const removeSubProduct = (matIdx: number, subIdx: number) => {
        const m = [...data.materials];
        m[matIdx] = { ...m[matIdx], sub_products: (m[matIdx].sub_products ?? []).filter((_: any, idx: number) => idx !== subIdx) };
        setMaterials(m);
    };

    const handleSelectProduct = (product: any) => {
        if (!pickerTarget) return;
        const { matIdx, subIdx } = pickerTarget;
        if (subIdx === undefined) {
            const m = [...data.materials];
            m[matIdx] = { ...m[matIdx], product_id: product.id, uom: m[matIdx].uom || product.unit || '' };
            setMaterials(m);
        } else {
            updateSubProduct(matIdx, subIdx, 'product_id', product.id);
            updateSubProduct(matIdx, subIdx, 'uom', product.unit || '');
        }
        setPickerTarget(null);
    };

    const selectedContract = useMemo(
        () => contracts?.find((c: any) => String(c.id) === String(data.contract_id)),
        [contracts, data.contract_id]
    );
    // SO berstatus confirmed pada kontrak terpilih.
    const confirmedSOs = useMemo(() => selectedContract?.sales_orders ?? [], [selectedContract]);

    // SO yang dipilih sebagai referensi (tanpa fallback otomatis ke SO pertama).
    const linkedSO = useMemo(
        () => confirmedSOs.find((s: any) => String(s.id) === String(data.sales_order_id)) ?? null,
        [confirmedSOs, data.sales_order_id]
    );
    const selectedPremise = linkedSO?.premise ?? null;

    // Item service SO (parent saja) untuk popup referensi.
    const soItems = useMemo(() => (linkedSO?.items ?? []).filter((it: any) => !it.parent_product_id), [linkedSO]);
    const selectedSoItem = useMemo(
        () => (linkedSO?.items ?? []).find((it: any) => it.id === data.sales_order_item_id) ?? null,
        [linkedSO, data.sales_order_item_id]
    );

    // Referensi tanggal visit plan SO untuk bulan item yang dipilih.
    const refVisitDates = useMemo(() => {
        if (!linkedSO || !selectedSoItem || !selectedContract) return [];
        return visitDatesForMonth(linkedSO.visit_plans, selectedContract, Number(selectedSoItem.month) || 1);
    }, [linkedSO, selectedSoItem, selectedContract]);

    // Tanggal visit yang sudah dipakai WO lain pada SO yang sama (kecuali WO ini).
    const dkey = (d: any) => String(d ?? '').slice(0, 10);
    const usedVisitDates = useMemo(() => {
        const others = (linkedSO?.work_orders ?? []).filter((w: any) => String(w.id) !== String(workOrder?.id));
        return new Set(others.map((w: any) => dkey(w.visit_date)).filter(Boolean));
    }, [linkedSO, workOrder]);

    // Opsi dropdown Visit Date: tanggal terpakai dinonaktifkan, dan hanya tanggal
    // bebas TERKECIL yang dapat dipilih (pemilihan berurutan dari yang terkecil).
    const visitDateOptions = useMemo(() => {
        const sorted = [...refVisitDates].sort((a: any, b: any) => dkey(a.visit_date).localeCompare(dkey(b.visit_date)));
        const earliestFree = sorted.find((v: any) => !usedVisitDates.has(dkey(v.visit_date)))?.visit_date ?? null;

        const opts = sorted.map((v: any) => {
            const used       = usedVisitDates.has(dkey(v.visit_date));
            const isCurrent  = !!data.visit_date && dkey(data.visit_date) === dkey(v.visit_date);
            const selectable = isCurrent || (!used && earliestFree != null && dkey(v.visit_date) === dkey(earliestFree));
            const suffix = used && !isCurrent ? ' — sudah digunakan'
                : (!used && !selectable ? ' — menunggu giliran' : '');
            return { value: v.visit_date, label: `Visit ${v.visit_number}: ${v.visit_date}${suffix}`, disabled: !selectable };
        });

        // Pastikan nilai tersimpan tetap tampil walau tak ada di daftar (mis. saat edit).
        if (data.visit_date && !opts.some((o: any) => dkey(o.value) === dkey(data.visit_date))) {
            opts.unshift({ value: data.visit_date, label: data.visit_date, disabled: false });
        }
        return opts;
    }, [refVisitDates, usedVisitDates, data.visit_date]);

    // Bulan item SO unik, urut menaik.
    const soItemMonths = useMemo(() => {
        const set = new Set<number>();
        soItems.forEach((it: any) => set.add(Number(it.month) || 1));
        return Array.from(set).sort((a, b) => a - b);
    }, [soItems]);

    // Bulan "aktif" = bulan terkecil yang tanggal visit-nya belum semua terpakai WO.
    // Pemilihan Referensi Item SO hanya boleh pada bulan ini (berurutan, tak boleh loncat).
    const activeMonth = useMemo(() => {
        const start = selectedContract?.start_date;
        const dur = Number(selectedContract?.duration_months) > 0 ? Number(selectedContract.duration_months) : 1;
        const usedByMonth: Record<number, number> = {};
        if (start) {
            (linkedSO?.work_orders ?? [])
                .filter((w: any) => String(w.id) !== String(workOrder?.id) && w.visit_date)
                .forEach((w: any) => {
                    const m = contractMonthOf(start, dkey(w.visit_date), dur);
                    usedByMonth[m] = (usedByMonth[m] ?? 0) + 1;
                });
        }
        for (const m of soItemMonths) {
            const plan = visitDatesForMonth(linkedSO?.visit_plans, selectedContract, m).length;
            const complete = plan === 0 ? true : (usedByMonth[m] ?? 0) >= plan;
            if (!complete) return m;
        }
        return null;
    }, [soItemMonths, linkedSO, selectedContract, workOrder]);

    const handleSelectContract = (contract: any) => {
        setData({
            ...data,
            contract_id:         contract.id,
            sales_order_id:      '',
            sales_order_item_id: '',
            materials:           [],
        });
    };

    const handleSelectSO = (so: any) => {
        setData({
            ...data,
            sales_order_id:      so.id,
            sales_order_item_id: '',
            materials:           [],
        });
        setSoPickerOpen(false);
    };

    // Memilih item SO: material used terisi dari item tsb untuk bulannya;
    // qty sub-produk dibagi jumlah tanggal visit plan SO pada bulan itu.
    const handleSelectSoItem = (item: any) => {
        setData({
            ...data,
            sales_order_item_id: item.id,
            materials:           materialsFromSoItem(item, linkedSO?.items ?? [], linkedSO?.visit_plans ?? [], selectedContract),
        });
        setSoItemPickerOpen(false);
    };

    const toggleVisitType = (val: string) => {
        const current: string[] = data.visit_types ?? [];
        setData('visit_types', current.includes(val) ? current.filter(v => v !== val) : [...current, val]);
    };

    // Kelompokkan material per periode bulan, simpan index aslinya untuk handler.
    const groups = (() => {
        const map = new Map<number, { mat: any; idx: number }[]>();
        data.materials.forEach((mat: any, idx: number) => {
            const m = Number(mat.month) || 1;
            if (!map.has(m)) map.set(m, []);
            map.get(m)!.push({ mat, idx });
        });
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    })();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((d: any) => ({ ...d, materials: flattenMaterials(d.materials) }));
        editing ? put(`/work-orders/${workOrder.id}`) : post('/work-orders');
    };

    const renderMaterialRows = (rows: { mat: any; idx: number }[]) =>
        rows.map(({ mat, idx }) => {
            const selected = getProduct(mat.product_id);
            return (
                <>
                    <tr key={`mat-${idx}`} className="align-top">
                        <td className="px-3 py-2">
                            <button
                                type="button"
                                onClick={() => setPickerTarget({ matIdx: idx })}
                                className="w-full text-left px-3 py-1.5 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                            >
                                {selected
                                    ? <span className="text-gray-800">{selected.name} <span className="text-gray-400 text-xs">(Stock: {selected.stock})</span></span>
                                    : <span className="text-gray-400">— Select Product —</span>
                                }
                            </button>
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{productUnit(selected) || '—'}</td>
                        <td className="px-3 py-2">
                            <input type="number" min={1} className={inputCls} value={mat.quantity_used} onChange={e => updateMaterial(idx, 'quantity_used', +e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                            <button type="button" onClick={() => removeMaterial(idx)} className="text-red-500 text-lg leading-none hover:text-red-700">×</button>
                        </td>
                    </tr>

                    <tr key={`sub-${idx}`} className="bg-blue-50">
                        <td colSpan={4} className="px-4 py-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-blue-700">Sub Product</span>
                                <button type="button" onClick={() => addSubProduct(idx)} className="text-xs text-blue-600 hover:underline">+ Add Sub Product</button>
                            </div>
                            {(mat.sub_products ?? []).length === 0 && (
                                <p className="text-xs text-blue-400 italic">No sub product yet.</p>
                            )}
                            {(mat.sub_products ?? []).length > 0 && (
                                <table className="w-full text-xs mt-1">
                                    <thead>
                                        <tr className="text-left text-blue-600 border-b border-blue-100">
                                            <th className="pb-1 pr-2">Sub Product</th>
                                            <th className="pb-1 w-16 pr-2">Unit</th>
                                            <th className="pb-1 w-24">Qty</th>
                                            <th className="pb-1 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-100">
                                        {mat.sub_products.map((sub: any, si: number) => {
                                            const subProduct = getProduct(sub.product_id);
                                            return (
                                                <tr key={si}>
                                                    <td className="py-1 pr-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPickerTarget({ matIdx: idx, subIdx: si })}
                                                            className="w-full text-left px-2 py-1 border rounded text-xs bg-white hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                                                        >
                                                            {subProduct ? <span className="text-gray-800">{subProduct.name}</span> : <span className="text-gray-400">— Select Product —</span>}
                                                        </button>
                                                    </td>
                                                    <td className="py-1 pr-2 text-gray-500">{productUnit(subProduct) || '—'}</td>
                                                    <td className="py-1 pr-2">
                                                        <input type="number" min={0} step="any" className={inputCls} value={sub.quantity_used} onChange={e => updateSubProduct(idx, si, 'quantity_used', +e.target.value)} />
                                                    </td>
                                                    <td className="py-1">
                                                        <button type="button" onClick={() => removeSubProduct(idx, si)} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </td>
                    </tr>
                </>
            );
        });

    return (
        <AppLayout header={editing ? 'Edit Work Order' : 'Create Work Order'}>
            <Head title="Work Order" />

            {pickerTarget && (
                <ProductPickerModal
                    products={products ?? []}
                    onSelect={handleSelectProduct}
                    onClose={() => setPickerTarget(null)}
                    extraLabel="Stock"
                    extraKey="stock"
                    extraFormat="number"
                />
            )}

            {contractPickerOpen && (
                <ContractPickerModal
                    contracts={contracts ?? []}
                    onSelect={handleSelectContract}
                    onClose={() => setContractPickerOpen(false)}
                />
            )}

            {soPickerOpen && (
                <SalesOrderRefPickerModal
                    salesOrders={confirmedSOs}
                    customerName={selectedContract?.customer?.name}
                    onSelect={handleSelectSO}
                    onClose={() => setSoPickerOpen(false)}
                />
            )}

            {soItemPickerOpen && (
                <SalesOrderItemPickerModal
                    items={soItems}
                    soNumber={linkedSO?.so_number}
                    activeMonth={activeMonth}
                    currentMonth={selectedSoItem ? Number(selectedSoItem.month) : null}
                    onSelect={handleSelectSoItem}
                    onClose={() => setSoItemPickerOpen(false)}
                />
            )}

            <div className="max-w-4xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    {locked && (
                        <div className="rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800">
                            Work Order ini berstatus <strong>Completed</strong>, sehingga hanya dapat dilihat (read-only) dan tidak dapat diubah.
                        </div>
                    )}

                    <fieldset disabled={locked} className="space-y-4 m-0 p-0 border-0 disabled:opacity-70">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="WO No." error={errors.wo_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.wo_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </FormField>
                    </div>

                    <FormField label="Contract No." error={errors.contract_id} required>
                        <button
                            type="button"
                            onClick={() => setContractPickerOpen(true)}
                            className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                        >
                            {selectedContract
                                ? <span className="text-gray-800">{selectedContract.contract_number} — {selectedContract.customer?.name ?? ''}</span>
                                : <span className="text-gray-400">— Pilih Kontrak —</span>
                            }
                        </button>
                    </FormField>

                    <FormField label="Referensi SO (Confirmed)" error={errors.sales_order_id}>
                        <button
                            type="button"
                            disabled={!selectedContract}
                            onClick={() => setSoPickerOpen(true)}
                            className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                            {linkedSO
                                ? <span className="text-gray-800 font-mono">{linkedSO.so_number}</span>
                                : <span className="text-gray-400">{selectedContract ? '— Pilih SO —' : 'Pilih kontrak terlebih dahulu'}</span>
                            }
                        </button>
                        {selectedPremise && (
                            <div className="mt-2 grid grid-cols-3 gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                                <div><span className="text-gray-500 block">Premis Lokasi</span><span className="text-gray-800 font-medium">{selectedPremise.location ?? '—'}</span></div>
                                <div><span className="text-gray-500 block">Premis Alamat</span><span className="text-gray-800 font-medium">{selectedPremise.address ?? '—'}</span></div>
                                <div><span className="text-gray-500 block">Premis PIC</span><span className="text-gray-800 font-medium">{selectedPremise.pic ?? '—'}</span></div>
                            </div>
                        )}
                    </FormField>

                    <FormField label="Referensi Item SO" error={errors.sales_order_item_id}>
                        <button
                            type="button"
                            disabled={!linkedSO}
                            onClick={() => setSoItemPickerOpen(true)}
                            className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                            {selectedSoItem
                                ? <span className="text-gray-800">Bulan {selectedSoItem.month} — {selectedSoItem.product?.name ?? '—'} <span className="text-gray-400 text-xs">(Qty {selectedSoItem.quantity} {selectedSoItem.uom ?? ''})</span></span>
                                : <span className="text-gray-400">{linkedSO ? '— Pilih Item Service SO —' : 'Pilih SO terlebih dahulu'}</span>
                            }
                        </button>
                        {linkedSO && (
                            <p className="text-xs text-gray-400 mt-1">Item product diambil dari SO <span className="font-mono">{linkedSO.so_number}</span></p>
                        )}
                    </FormField>

                    <FormField label={`Visit Date${selectedSoItem ? ` — Visit Plan SO (Bulan ${selectedSoItem.month})` : ''}`} error={errors.visit_date} required>
                        {visitDateOptions.length > 0 ? (
                            <select className={inputCls} value={data.visit_date} onChange={e => setData('visit_date', e.target.value)}>
                                <option value="">— Pilih Tanggal Visit (dari Visit Plan SO) —</option>
                                {visitDateOptions.map((o: any, i: number) => (
                                    <option key={i} value={o.value} disabled={o.disabled}>{o.label}</option>
                                ))}
                            </select>
                        ) : (
                            <input type="date" className={inputCls} value={data.visit_date} onChange={e => setData('visit_date', e.target.value)} />
                        )}
                        {selectedSoItem
                            ? <p className="text-xs text-gray-400 mt-1">{refVisitDates.length > 0 ? 'Satu Work Order = satu tanggal visit. Dipilih berurutan dari tanggal terkecil; tanggal yang sudah dipakai dinonaktifkan.' : 'Tidak ada tanggal di Visit Plan SO bulan ini — isi manual.'}</p>
                            : <p className="text-xs text-gray-400 mt-1">Pilih Referensi Item SO untuk menampilkan daftar tanggal visit.</p>
                        }
                    </FormField>

                    <FormField label="Technician" error={errors.technician_id}>
                        <select className={inputCls} value={data.technician_id} onChange={e => setData('technician_id', e.target.value)}>
                            <option value="">— Select Technician (optional, can be filled later) —</option>
                            {technicians?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </FormField>

                    <FormField label="Service Area" error={errors.service_area} required>
                        <input
                            className={inputCls}
                            value={data.service_area}
                            onChange={e => setData('service_area', e.target.value)}
                            placeholder="Enter service area"
                        />
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Time In (filled by technician)">
                            <input type="time" className={inputCls} value={data.time_in} onChange={e => setData('time_in', e.target.value)} />
                        </FormField>
                        <FormField label="Time Out (filled by technician)">
                            <input type="time" className={inputCls} value={data.time_out} onChange={e => setData('time_out', e.target.value)} />
                        </FormField>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type</label>
                        <div className="flex gap-6">
                            {VISIT_TYPES.map(vt => (
                                <label key={vt.value} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={(data.visit_types ?? []).includes(vt.value)}
                                        onChange={() => toggleVisitType(vt.value)}
                                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-gray-700">{vt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2 mt-2">
                            <h3 className="font-semibold text-gray-700">Material Used</h3>
                            {selectedSoItem && (
                                <span className="text-xs text-gray-400">
                                    Qty sub-produk dibagi {refVisitDates.length || 1} tanggal visit (Bulan {selectedSoItem.month}, SO {linkedSO?.so_number})
                                </span>
                            )}
                        </div>
                        {errors.materials && (
                            <div className="mb-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{errors.materials}</div>
                        )}

                        {groups.length === 0 && (
                            <p className="text-sm text-gray-400 italic mb-2">Belum ada material. Pilih Referensi Item SO untuk mengisi otomatis, atau tambah periode bulan.</p>
                        )}

                        <div className="space-y-3">
                            {groups.map(([month, rows]) => {
                                const isCollapsed = !!collapsed[month];
                                return (
                                    <div key={month} className="border rounded-lg overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => toggleMonth(month)}
                                            className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-200 px-4 py-2 text-left transition"
                                        >
                                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                <span className="text-gray-400 w-3 inline-block">{isCollapsed ? '▶' : '▼'}</span>
                                                Bulan {month}
                                                <span className="text-xs font-normal text-gray-400">({rows.length} item)</span>
                                            </span>
                                        </button>

                                        {!isCollapsed && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm min-w-[640px]">
                                                    <thead className="bg-gray-50 border-b">
                                                        <tr className="text-left text-gray-600 text-xs">
                                                            <th className="px-3 py-2">Product</th>
                                                            <th className="px-3 py-2 w-20">Unit</th>
                                                            <th className="px-3 py-2 w-28">Qty</th>
                                                            <th className="px-3 py-2 w-8"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {renderMaterialRows(rows)}
                                                    </tbody>
                                                </table>
                                                <div className="px-4 py-2 bg-gray-50 border-t">
                                                    <button type="button" onClick={() => addMaterialToMonth(month)} className="text-xs text-red-600 hover:underline">+ Tambah Product (Bulan {month})</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button type="button" onClick={addPeriod} className="mt-3 text-sm text-red-600 hover:underline">+ Tambah Periode Bulan</button>
                    </div>

                    <FormField label="Technician Notes">
                        <textarea rows={3} className={inputCls} value={data.technician_notes} onChange={e => setData('technician_notes', e.target.value)} />
                    </FormField>
                    </fieldset>

                    <div className="flex gap-3 pt-2">
                        {!locked && (
                            <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                                {processing ? 'Saving...' : 'Save'}
                            </button>
                        )}
                        <Link href="/work-orders" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                            {locked ? 'Kembali' : 'Cancel'}
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

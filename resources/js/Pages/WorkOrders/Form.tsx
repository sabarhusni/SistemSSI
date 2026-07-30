import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ProductPickerModal from '@/Components/ProductPickerModal';
import ContractPickerModal from '@/Components/ContractPickerModal';
import SalesOrderRefPickerModal from '@/Components/SalesOrderRefPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';

const VISIT_TYPES = [
    { value: 'routine',   label: 'Routine' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'followup',  label: 'Follow Up' },
];

const SERVICE_TYPES = [
    { value: 'pest_control', label: 'Pest Control' },
    { value: 'scenting',     label: 'Scenting' },
];

const emptyMaterial = (month = 1) => ({
    product_id:   '',
    month,
    uom:          '',
    method_of_application: '',
    quantity_used: 1,
    sub_products: [] as any[],
});

const round2 = (n: number) => Math.round(n * 100) / 100;

// Ubah "HH:MM" / "HH:MM:SS" menjadi menit sejak 00:00, atau null bila kosong/tidak valid.
const timeToMin = (t: any): number | null => {
    if (!t) return null;
    const p = String(t).split(':');
    if (p.length < 2) return null;
    const h = Number(p[0]), m = Number(p[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
};

// Dua rentang waktu beririsan hanya bila keduanya lengkap, valid (akhir > awal), dan tumpang tindih.
// Batas yang bersentuhan (10:00–11:00 vs 11:00–12:00) tidak dianggap bentrok.
const rangesOverlap = (a1: number | null, a2: number | null, b1: number | null, b2: number | null): boolean => {
    if (a1 === null || a2 === null || b1 === null || b2 === null) return false;
    if (a2 <= a1 || b2 <= b1) return false;
    return a1 < b2 && b1 < a2;
};

// Paksa input waktu ke format 24 jam (HH:MM), tanpa AM/PM. Jam dibatasi 0–23, menit 0–59.
const formatTime24 = (raw: string) => {
    const d = String(raw).replace(/\D/g, '').slice(0, 4);
    let hh = d.slice(0, 2);
    let mm = d.slice(2, 4);
    if (hh.length === 2 && +hh > 23) hh = '23';
    if (mm.length === 2 && +mm > 59) mm = '59';
    return mm.length ? `${hh}:${mm}` : hh;
};

// Tanggal visit plan SO yang jatuh pada bulan kontrak tertentu (bulan 1 = bulan start_date).
function visitDatesForMonth(visitPlans: any[], contract: any, month: number): any[] {
    const dated = (visitPlans ?? []).filter((v: any) => v.visit_date);
    const start = contract?.start_date;
    if (!start) return dated;
    const duration = Number(contract?.duration_months) > 0 ? Number(contract.duration_months) : 1;
    return dated.filter((v: any) => contractMonthOf(start, v.visit_date, duration) === month);
}

// Susun material used dari SEMUA item service SO (parent) pada bulan yang dipilih.
// Qty default tiap sub-produk = qty sub-produk SO dibagi rata sejumlah visit plan
// SO pada bulan tsb (satu visit menggunakan satu bagian dari total qty bulan itu).
function materialsFromMonth(month: number, parentItems: any[], soItems: any[], visitCount: number): any[] {
    if (!month) return [];
    const items = (parentItems ?? []).filter((it: any) => (Number(it.month) || 1) === month);

    return items.map((item: any) => {
        const subs = (soItems ?? []).filter(
            (it: any) => it.parent_product_id === item.product_id && (Number(it.month) || 1) === month
        );
        return {
            product_id:    item.product_id,
            month,
            uom:           item.uom ?? item.product?.unit ?? '',
            method_of_application: '',
            quantity_used: Number(item.quantity) || 1,
            sub_products: subs.map((sp: any) => {
                const soQty = Number(sp.quantity) || 0;
                const perVisit = visitCount > 0 ? soQty / visitCount : soQty;
                return {
                    product_id:    sp.product_id,
                    uom:           sp.uom ?? sp.product?.unit ?? '',
                    method_of_application: '',
                    quantity_used: round2(Math.max(0, perVisit)),
                };
            }),
        };
    });
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
        method_of_application: p.method_of_application ?? '',
        quantity_used: p.quantity_used,
        sub_products: children
            .filter((c: any) => c.parent_product_id === p.product_id && (c.month ?? 1) === (p.month ?? 1))
            .map((c: any) => ({ product_id: c.product_id, quantity_used: c.quantity_used, uom: c.uom ?? '', method_of_application: c.method_of_application ?? '' })),
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
            method_of_application: m.method_of_application ?? null,
            quantity_used:     Number(m.quantity_used || 1),
        });
        for (const sub of (m.sub_products ?? [])) {
            if (!sub.product_id) continue;
            push({
                product_id:        sub.product_id,
                parent_product_id: m.product_id,
                month,
                uom:               sub.uom ?? null,
                method_of_application: sub.method_of_application ?? null,
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

export default function Form({ workOrder, technicians, products, contracts, nextNumber, technicianBookings = [], locked = false }: any) {
    const editing = !!workOrder;

    const { data, setData, post, put, transform, processing, errors } = useForm<any>({
        contract_id:               workOrder?.contract_id               ?? '',
        sales_order_id:            workOrder?.sales_order_id            ?? '',
        month:                     workOrder?.month ?? workOrder?.sales_order_item?.month ?? '',
        sales_order_visit_plan_id: workOrder?.sales_order_visit_plan_id ?? '',
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
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
    // Tipe layanan dipilih dulu untuk menyaring daftar Contract No. Bila kontrak sudah
    // terpilih, tipe layanan mengikuti kontrak tsb (konsisten dengan filter yang aktif).
    const [serviceType, setServiceType] = useState<string>('');

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
    const removeMaterial = (i: number) => setMaterials(data.materials.filter((_: any, idx: number) => idx !== i));

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
    // Bila kontrak sudah terpilih, tipe layanan mengikuti kontrak tsb; selain itu ikut pilihan Services.
    const effectiveServiceType = selectedContract ? (selectedContract.service_type ?? '') : serviceType;
    const filteredContracts = useMemo(
        () => (contracts ?? []).filter((c: any) => !effectiveServiceType || c.service_type === effectiveServiceType),
        [contracts, effectiveServiceType]
    );
    // SO berstatus confirmed pada kontrak terpilih.
    const confirmedSOs = useMemo(() => selectedContract?.sales_orders ?? [], [selectedContract]);

    // SO yang dipilih sebagai referensi (tanpa fallback otomatis ke SO pertama).
    const linkedSO = useMemo(
        () => confirmedSOs.find((s: any) => String(s.id) === String(data.sales_order_id)) ?? null,
        [confirmedSOs, data.sales_order_id]
    );
    const selectedPremise = linkedSO?.premise ?? null;

    // Item service SO (parent saja) untuk referensi bulan & material used.
    const soItems = useMemo(() => (linkedSO?.items ?? []).filter((it: any) => !it.parent_product_id), [linkedSO]);
    const selectedMonth = useMemo(() => Number(data.month) || null, [data.month]);

    // Referensi tanggal visit plan SO untuk bulan yang dipilih.
    const refVisitDates = useMemo(() => {
        if (!linkedSO || !selectedMonth || !selectedContract) return [];
        return visitDatesForMonth(linkedSO.visit_plans, selectedContract, selectedMonth);
    }, [linkedSO, selectedMonth, selectedContract]);

    // Tanggal visit yang sudah dipakai WO lain pada SO yang sama (kecuali WO ini).
    const dkey = (d: any) => String(d ?? '').slice(0, 10);
    const usedVisitDates = useMemo(() => {
        const others = (linkedSO?.work_orders ?? []).filter((w: any) => String(w.id) !== String(workOrder?.id));
        return new Set(others.map((w: any) => dkey(w.visit_date)).filter(Boolean));
    }, [linkedSO, workOrder]);

    // Opsi dropdown "Visit ke-": daftar visit plan SO untuk bulan item terpilih.
    // Visit yang sudah dipakai WO lain dinonaktifkan (cocok per visit plan atau per tanggal).
    const visitPlanOptions = useMemo(() => {
        const others      = (linkedSO?.work_orders ?? []).filter((w: any) => String(w.id) !== String(workOrder?.id));
        const usedPlanIds = new Set(others.map((w: any) => w.sales_order_visit_plan_id).filter(Boolean));
        return [...refVisitDates]
            .sort((a: any, b: any) => dkey(a.visit_date).localeCompare(dkey(b.visit_date)))
            .map((v: any) => {
                const isCurrent = String(data.sales_order_visit_plan_id) === String(v.id);
                const used      = usedPlanIds.has(v.id) || usedVisitDates.has(dkey(v.visit_date));
                return { id: v.id, visit_number: v.visit_number, visit_date: v.visit_date, disabled: !isCurrent && used };
            });
    }, [refVisitDates, usedVisitDates, linkedSO, workOrder, data.sales_order_visit_plan_id]);

    // Teknisi yang jam kerjanya bentrok dengan WO lain pada tanggal visit yang dipilih → tidak tersedia.
    // Teknisi boleh menangani beberapa WO di hari sama selama time_in–time_out tidak beririsan.
    // Map technician_id → wo_number (WO ini sendiri dikecualikan).
    const bookedTechnicians = useMemo(() => {
        const date = dkey(data.visit_date);
        const map = new Map<string, string>();
        if (!date) return map;
        const a1 = timeToMin(data.time_in), a2 = timeToMin(data.time_out);
        // Tanpa jam lengkap pada WO ini, bentrok tak dapat disimpulkan → tidak menonaktifkan siapa pun.
        if (a1 === null || a2 === null) return map;
        (technicianBookings ?? []).forEach((b: any) => {
            if (String(b.id) === String(workOrder?.id)) return;
            if (!b.technician_id || dkey(b.visit_date) !== date) return;
            if (rangesOverlap(a1, a2, timeToMin(b.time_in), timeToMin(b.time_out))) {
                map.set(String(b.technician_id), b.wo_number);
            }
        });
        return map;
    }, [technicianBookings, data.visit_date, data.time_in, data.time_out, workOrder]);

    // Bulan item SO unik, urut menaik.
    const soItemMonths = useMemo(() => {
        const set = new Set<number>();
        soItems.forEach((it: any) => set.add(Number(it.month) || 1));
        return Array.from(set).sort((a, b) => a - b);
    }, [soItems]);

    // Bulan "aktif" = bulan terkecil yang tanggal visit-nya belum semua terpakai WO.
    // Pemilihan Referensi Bulan hanya boleh pada bulan ini (berurutan, tak boleh loncat).
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

    // Ganti tipe layanan: bila kontrak yang sudah dipilih tidak cocok tipe baru, reset pilihan kontrak.
    const handleSelectServiceType = (value: string) => {
        setServiceType(value);
        if (selectedContract && selectedContract.service_type !== value) {
            setData({
                ...data,
                contract_id:               '',
                sales_order_id:            '',
                month:                     '',
                sales_order_visit_plan_id: '',
                visit_date:                '',
                materials:                 [],
            });
        }
    };

    const handleSelectContract = (contract: any) => {
        setData({
            ...data,
            contract_id:               contract.id,
            sales_order_id:            '',
            month:                     '',
            sales_order_visit_plan_id: '',
            visit_date:                '',
            materials:                 [],
        });
    };

    const handleSelectSO = (so: any) => {
        setData({
            ...data,
            sales_order_id:            so.id,
            month:                     '',
            sales_order_visit_plan_id: '',
            visit_date:                '',
            materials:                 [],
        });
        setSoPickerOpen(false);
    };

    // Memilih bulan referensi: material used terisi dari SEMUA item service SO pada
    // bulan tsb; qty default tiap sub-produk = qty sub-produk SO dibagi rata sejumlah
    // visit plan SO pada bulan tsb.
    const handleSelectMonth = (month: number) => {
        const visitCount = visitDatesForMonth(linkedSO?.visit_plans, selectedContract, month).length;
        setData({
            ...data,
            month,
            sales_order_visit_plan_id: '',
            visit_date:                '',
            materials:                 materialsFromMonth(month, soItems, linkedSO?.items ?? [], visitCount),
        });
    };

    // Pilih Visit ke-N: set referensi visit plan & default tanggal dari plan tsb.
    // Tanggal masih bisa diubah; saat simpan, tanggal WO menimpa tanggal Visit Plan SO.
    const handleSelectVisitPlan = (planId: string) => {
        const plan = refVisitDates.find((v: any) => String(v.id) === String(planId));
        setData({
            ...data,
            sales_order_visit_plan_id: planId,
            visit_date: planId ? (plan?.visit_date ?? data.visit_date) : data.visit_date,
        });
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

    // Req 2: produk parent yang diambil dari referensi bulan SO — qty & produk terkunci.
    // Hanya produk baru (tambahan) dan qty sub-produk yang dapat diubah.
    const isFromSo = (mat: any) =>
        soItems.some((it: any) =>
            String(it.product_id) === String(mat.product_id)
            && (Number(it.month) || 1) === (Number(mat.month) || 1)
        );

    const renderMaterialRows = (rows: { mat: any; idx: number }[]) =>
        rows.map(({ mat, idx }) => {
            const selected = getProduct(mat.product_id);
            const fromSo = isFromSo(mat);
            return (
                <>
                    <tr key={`mat-${idx}`} className="align-top">
                        <td className="px-3 py-2">
                            <button
                                type="button"
                                disabled={fromSo}
                                onClick={() => setPickerTarget({ matIdx: idx })}
                                className="w-full text-left px-3 py-1.5 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-100 disabled:cursor-not-allowed disabled:hover:border-gray-200"
                            >
                                {selected
                                    ? <span className="text-gray-800">{selected.name} <span className="text-gray-400 text-xs">(Stock: {selected.stock})</span></span>
                                    : <span className="text-gray-400">— Select Product —</span>
                                }
                            </button>
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{productUnit(selected) || '—'}</td>
                        <td className="px-3 py-2">
                            <input type="number" min={1} readOnly={fromSo} disabled={fromSo} className={fromSo ? `${inputCls} bg-gray-100 cursor-not-allowed` : inputCls} value={mat.quantity_used} onChange={e => updateMaterial(idx, 'quantity_used', +e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                            <input type="text" placeholder="Metode aplikasi" className={inputCls} value={mat.method_of_application ?? ''} onChange={e => updateMaterial(idx, 'method_of_application', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                            {!fromSo && (
                                <button type="button" onClick={() => removeMaterial(idx)} className="text-red-500 text-lg leading-none hover:text-red-700">×</button>
                            )}
                        </td>
                    </tr>

                    <tr key={`sub-${idx}`} className="bg-blue-50">
                        <td colSpan={5} className="px-4 py-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-blue-700">Sub Product</span>
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
                                            <th className="pb-1 w-24 pr-2">Qty</th>
                                            <th className="pb-1 w-32">Method of Application</th>
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
                                                    <td className="py-1 pr-2">
                                                        <input type="text" placeholder="Metode aplikasi" className={inputCls} value={sub.method_of_application ?? ''} onChange={e => updateSubProduct(idx, si, 'method_of_application', e.target.value)} />
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
                    typeFilter="goods"
                />
            )}

            {contractPickerOpen && (
                <ContractPickerModal
                    contracts={filteredContracts}
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

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Services">
                            <select
                                className={inputCls}
                                value={effectiveServiceType}
                                onChange={e => handleSelectServiceType(e.target.value)}
                            >
                                <option value="">— Pilih Tipe Layanan —</option>
                                {SERVICE_TYPES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Menentukan daftar Contract No. di samping.</p>
                        </FormField>
                        <FormField label="Contract No." error={errors.contract_id} required>
                            <button
                                type="button"
                                disabled={!effectiveServiceType}
                                onClick={() => setContractPickerOpen(true)}
                                className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                            >
                                {selectedContract
                                    ? <span className="text-gray-800">{selectedContract.contract_number} — {selectedContract.customer?.name ?? ''}</span>
                                    : <span className="text-gray-400">{effectiveServiceType ? '— Pilih Kontrak —' : 'Pilih Services terlebih dahulu'}</span>
                                }
                            </button>
                        </FormField>
                    </div>

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

                    <FormField label="Visit Plan" error={errors.month}>
                        <select
                            className={inputCls}
                            value={data.month}
                            onChange={e => handleSelectMonth(+e.target.value)}
                            disabled={!linkedSO}
                        >
                            <option value="">{linkedSO ? '— Select Visit Plan —' : 'Pilih SO terlebih dahulu'}</option>
                            {soItemMonths.map((m: number) => {
                                const ok = m === selectedMonth || (activeMonth != null && m === activeMonth);
                                const reason = activeMonth != null && m > activeMonth ? 'belum giliran' : 'selesai';
                                return (
                                    <option key={m} value={m} disabled={!ok}>
                                        Visit ke-{m}{!ok ? ` — ${reason}` : ''}
                                    </option>
                                );
                            })}
                        </select>
                        {linkedSO && (
                            <p className="text-xs text-gray-400 mt-1">Bulan berurutan dari yang terkecil. Produk diambil dari SO <span className="font-mono">{linkedSO.so_number}</span></p>
                        )}
                    </FormField>

                    <FormField label={`Pilih Visit${selectedMonth ? ` — Visit Plan SO (Bulan ${selectedMonth})` : ''}`} error={errors.sales_order_visit_plan_id}>
                        <select
                            className={inputCls}
                            value={data.sales_order_visit_plan_id}
                            onChange={e => handleSelectVisitPlan(e.target.value)}
                            disabled={visitPlanOptions.length === 0}
                        >
                            <option value="">{visitPlanOptions.length ? '— Pilih Visit ke- (dari Visit Plan SO) —' : 'Pilih Referensi Bulan terlebih dahulu'}</option>
                            {visitPlanOptions.map((o: any) => (
                                <option key={o.id} value={o.id} disabled={o.disabled}>
                                    Visit {o.visit_number}: {o.visit_date || '(tanpa tanggal)'}{o.disabled ? ' — sudah digunakan' : ''}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            {selectedMonth
                                ? 'Pilih visit ke- dari Visit Plan SO. Tanggal default mengikuti plan dan masih bisa diubah di bawah.'
                                : 'Pilih Referensi Bulan untuk menampilkan daftar visit.'}
                        </p>
                    </FormField>

                    <FormField label="Visit Date" error={errors.visit_date} required>
                        <input type="date" className={inputCls} value={data.visit_date} onChange={e => setData('visit_date', e.target.value)} />
                        <p className="text-xs text-gray-400 mt-1">
                            Tanggal dapat diubah bebas. Saat disimpan, tanggal ini memperbarui tanggal Visit Plan SO untuk visit yang dipilih.
                        </p>
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Time In" error={errors.time_in}>
                            <input type="text" inputMode="numeric" placeholder="HH:MM (24 jam)" maxLength={5} className={inputCls} value={data.time_in} onChange={e => setData('time_in', formatTime24(e.target.value))} />
                        </FormField>
                        <FormField label="Time Out" error={errors.time_out}>
                            <input type="text" inputMode="numeric" placeholder="HH:MM (24 jam)" maxLength={5} className={inputCls} value={data.time_out} onChange={e => setData('time_out', formatTime24(e.target.value))} />
                        </FormField>
                    </div>
                    <p className="-mt-2 text-xs text-gray-400">Isi jam WO terlebih dahulu agar daftar teknisi tersaring sesuai tanggal & jam.</p>

                    <FormField label="Technician" error={errors.technician_id}>
                        <select className={inputCls} value={data.technician_id} onChange={e => setData('technician_id', e.target.value)}>
                            <option value="">— Select Technician (optional, can be filled later) —</option>
                            {technicians?.map((t: any) => {
                                const bookedWo = bookedTechnicians.get(String(t.id));
                                const isCurrent = String(data.technician_id) === String(t.id);
                                const unavailable = !!bookedWo && !isCurrent;
                                const label = `${t.employee_number} — ${t.name}${t.position ? ` (${t.position})` : ''}`;
                                return (
                                    <option key={t.id} value={t.id} disabled={unavailable}>
                                        {label}{unavailable ? ` — jam bentrok (WO ${bookedWo})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            {!data.visit_date
                                ? 'Isi Visit Date terlebih dahulu untuk mengecek ketersediaan teknisi.'
                                : (timeToMin(data.time_in) === null || timeToMin(data.time_out) === null)
                                    ? 'Isi Time In & Time Out untuk mengecek bentrok jadwal. Teknisi boleh menangani beberapa WO di hari sama selama jamnya tidak beririsan.'
                                    : 'Teknisi yang jam kerjanya beririsan dengan Work Order lain pada tanggal ini dinonaktifkan.'}
                        </p>
                    </FormField>

                    <FormField label="Service Area" error={errors.service_area} required>
                        <input
                            className={inputCls}
                            value={data.service_area}
                            onChange={e => setData('service_area', e.target.value)}
                            placeholder="Enter service area"
                        />
                    </FormField>

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
                            {selectedMonth && (
                                <span className="text-xs text-gray-400">
                                    Qty default sub-produk = Qty SO ÷ jumlah visit plan (Visit Ke-{selectedMonth}, SO {linkedSO?.so_number})
                                </span>
                            )}
                        </div>
                        {errors.materials && (
                            <div className="mb-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{errors.materials}</div>
                        )}

                        {groups.length === 0 && (
                            <p className="text-sm text-gray-400 italic mb-2">Belum ada material. Pilih Referensi Bulan untuk mengisi otomatis semua produk SO, atau tambah periode bulan.</p>
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
                                                Visit Ke-{month}
                                                <span className="text-xs font-normal text-gray-400">({rows.length} item)</span>
                                            </span>
                                        </button>

                                        {!isCollapsed && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm min-w-[820px]">
                                                    <thead className="bg-gray-50 border-b">
                                                        <tr className="text-left text-gray-600 text-xs">
                                                            <th className="px-3 py-2">Product</th>
                                                            <th className="px-3 py-2 w-20">Unit</th>
                                                            <th className="px-3 py-2 w-28">Qty</th>
                                                            <th className="px-3 py-2 w-40">Method of Application</th>
                                                            <th className="px-3 py-2 w-8"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {renderMaterialRows(rows)}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <FormField label="Technician Notes / Recommendation" error={errors.technician_notes}>
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

import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ProductPickerModal from '@/Components/ProductPickerModal';
import ContractPickerModal from '@/Components/ContractPickerModal';
import PremisePickerModal from '@/Components/PremisePickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const woBadgeCls = (s: string) =>
    ({
        pending:     'bg-gray-100 text-gray-600',
        in_progress: 'bg-amber-100 text-amber-700',
        completed:   'bg-emerald-100 text-emerald-700',
        cancelled:   'bg-red-100 text-red-600',
    }[s] ?? 'bg-gray-100 text-gray-600');

const dkey = (d: any) => String(d ?? '').slice(0, 10);

// Petakan tanggal visit ke nomor bulan kontrak (bulan 1 = bulan start_date).
function contractMonthOf(start: string, date: string, duration: number): number {
    const s = new Date(start), d = new Date(date);
    let diff = (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()) + 1;
    if (diff < 1) diff = 1;
    if (diff > duration) diff = duration;
    return diff;
}

// Tanggal visit plan SO yang jatuh pada bulan kontrak tertentu.
function visitDatesForMonth(visitPlans: any[], contract: any, month: number): any[] {
    const dated = (visitPlans ?? []).filter((v: any) => v.visit_date);
    const start = contract?.start_date;
    if (!start) return dated;
    const duration = Number(contract?.duration_months) > 0 ? Number(contract.duration_months) : 1;
    return dated.filter((v: any) => contractMonthOf(start, v.visit_date, duration) === month);
}

// Label unit yang ditampilkan: prioritaskan UOM (relasi uom_id), fallback ke Product.unit.
const uomLabel = (uom: any, fallback?: string) => uom?.symbol ?? uom?.name ?? fallback ?? '';

const emptySub = () => ({ product_id: '', quantity: 1, uom: '', uom_id: null });

const emptyService = (taxRate = 0, month = 1) => ({
    product_id:   '',
    month,
    quantity:     1,
    uom:          '',
    uom_id:       null,
    unit_price:   '',
    tax_rate:     taxRate,
    sub_products: [] as any[],
});

// Susun service items (beserta sub produk bersarang) dari premis terpilih,
// direplikasi per bulan sejumlah periode kontrak (duration_months).
function servicesFromPremise(premise: any, durationMonths: number, taxRate: number): any[] {
    const services = premise?.services ?? [];
    if (!services.length) return [];

    const periods = Number(durationMonths) > 0 ? Number(durationMonths) : 1;
    const result: any[] = [];

    for (let month = 1; month <= periods; month++) {
        for (const svc of services) {
            result.push({
                product_id: svc.product_id,
                month,
                quantity:   Number(svc.quantity ?? 1),
                uom:        uomLabel(svc.uom, svc.product?.unit),
                uom_id:     svc.uom_id ?? null,
                unit_price: Number(svc.unit_price ?? svc.product?.sales_price ?? svc.product?.price ?? 0),
                tax_rate:   Number(svc.tax_rate ?? taxRate) || 0,
                sub_products: (svc.sub_products ?? svc.subProducts ?? []).map((sp: any) => ({
                    product_id: sp.product_id,
                    quantity:   Number(sp.quantity ?? 1),
                    uom:        uomLabel(sp.uom, sp.product?.unit),
                    uom_id:     sp.uom_id ?? null,
                })),
            });
        }
    }

    return result;
}

// Rekonstruksi struktur bersarang dari baris flat sales_order_items saat edit.
function servicesFromItems(items: any[], taxRate: number): any[] {
    if (!items?.length) return [emptyService(taxRate)];

    const parents = items.filter((it: any) => !it.parent_product_id);
    const children = items.filter((it: any) => it.parent_product_id);

    return parents.map((p: any) => ({
        product_id: p.product_id,
        month:      p.month ?? 1,
        quantity:   p.quantity,
        uom:        p.uom ?? '',
        uom_id:     p.uom_id ?? null,
        unit_price: p.unit_price,
        tax_rate:   p.tax_rate ?? taxRate,
        sub_products: children
            .filter((c: any) => c.parent_product_id === p.product_id && (c.month ?? 1) === (p.month ?? 1))
            .map((c: any) => ({ product_id: c.product_id, quantity: c.quantity, uom: c.uom ?? '', uom_id: c.uom_id ?? null })),
    }));
}

// Ratakan struktur bersarang menjadi baris flat untuk disimpan.
// (product_id, month) dijaga unik dengan menjumlahkan quantity bila duplikat.
function flattenServices(services: any[]): any[] {
    const map = new Map<string, any>();
    const push = (row: any) => {
        const key = `${row.product_id}-${row.month}`;
        const existing = map.get(key);
        if (existing) {
            existing.quantity = Number(existing.quantity || 0) + Number(row.quantity || 0);
        } else {
            map.set(key, row);
        }
    };

    for (const svc of services) {
        if (!svc.product_id) continue;
        const month = Number(svc.month) || 1;
        push({
            product_id:        svc.product_id,
            parent_product_id: null,
            month,
            quantity:          Number(svc.quantity || 0),
            uom:               svc.uom ?? null,
            uom_id:            svc.uom_id ?? null,
            uom_conversion:    1,
            unit_price:        Number(svc.unit_price || 0),
            tax_rate:          Number(svc.tax_rate || 0),
        });
        for (const sub of (svc.sub_products ?? [])) {
            if (!sub.product_id) continue;
            push({
                product_id:        sub.product_id,
                parent_product_id: svc.product_id,
                month,
                quantity:          Number(sub.quantity || 0),
                uom:               sub.uom ?? null,
                uom_id:            sub.uom_id ?? null,
                uom_conversion:    1,
                unit_price:        0,
                tax_rate:          0,
            });
        }
    }

    return Array.from(map.values());
}

export default function Form({ salesOrder, contracts, products, uoms = [], nextNumber, taxType = 'exclude', taxRateSo = 11, workOrders = [], usedPremiseIds = [], woUsage = {}, settlementAmount = 0 }: any) {
    const editing = !!salesOrder;

    const { data, setData, post, put, transform, processing, errors } = useForm<any>({
        contract_id:         salesOrder?.contract_id         ?? '',
        contract_premise_id: salesOrder?.contract_premise_id ?? '',
        customer_id:         salesOrder?.customer_id         ?? '',
        so_number:           salesOrder?.so_number           ?? nextNumber ?? '',
        order_date:          salesOrder?.order_date ?? salesOrder?.service_date ?? '',
        status:              salesOrder?.status              ?? 'draft',
        notes:               salesOrder?.notes               ?? '',
        services:            editing ? servicesFromItems(salesOrder.items ?? [], taxRateSo) : [],
        visit_plans:         (salesOrder?.visit_plans ?? []).map((vp: any) => ({
            visit_number: vp.visit_number,
            visit_date:   vp.visit_date ?? '',
            quantity:     vp.quantity ?? '',
        })),
    });

    // Bangun baris visit plan kosong sebanyak visit frequency premis.
    const makeVisitPlans = (freq: number) =>
        Array.from({ length: Math.max(0, Number(freq) || 0) }, (_, i) => ({ visit_number: i + 1, visit_date: '', quantity: '' }));

    const [pickerTarget, setPickerTarget] = useState<{ svcIdx: number; subIdx?: number } | null>(null);
    const [contractPickerOpen, setContractPickerOpen] = useState(false);
    const [premisePickerOpen, setPremisePickerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

    const selectedContract = contracts?.find((c: any) => String(c.id) === String(data.contract_id));
    // Settlement Amount: total invoice yang sudah dibayar (payment Verified) untuk
    // kontrak DAN No SO ini (dari backend) — 0 untuk SO baru yang belum punya invoice.
    const settlementAmountNum = Number(settlementAmount ?? 0);
    const premiseOptions   = selectedContract?.premises ?? [];
    const selectedPremise  = premiseOptions.find((p: any) => String(p.id) === String(data.contract_premise_id));
    const getProduct       = (id: string) => products?.find((p: any) => p.id === id);
    const productUnit      = (p: any) => p?.unit ?? '';

    // Qty pemakaian sub-produk pada Work Order (dikelompokkan parent-produk-bulan).
    const subWoQty = (parentProductId: string, subProductId: string, month: any) =>
        Number(woUsage?.[`${parentProductId}-${subProductId}-${Number(month) || 1}`] ?? 0);

    const setServices = (services: any[]) => setData('services', services);
    const toggleMonth = (month: number) => setCollapsed(c => ({ ...c, [month]: !c[month] }));

    const updateService = (i: number, field: string, value: any) => {
        const services = [...data.services];
        services[i] = { ...services[i], [field]: value };
        setServices(services);
    };
    const addServiceToMonth = (month: number) => setServices([...data.services, emptyService(taxRateSo, month)]);
    const addPeriod = () => {
        const maxMonth = data.services.reduce((m: number, s: any) => Math.max(m, Number(s.month) || 0), 0);
        addServiceToMonth(maxMonth + 1);
    };
    const removeService = (i: number) => setServices(data.services.filter((_: any, idx: number) => idx !== i));

    const addSubProduct = (svcIdx: number) => {
        const services = [...data.services];
        services[svcIdx] = { ...services[svcIdx], sub_products: [...(services[svcIdx].sub_products ?? []), emptySub()] };
        setServices(services);
    };
    const updateSubProduct = (svcIdx: number, subIdx: number, field: string, value: any) => {
        const services = [...data.services];
        const subs = [...(services[svcIdx].sub_products ?? [])];
        subs[subIdx] = { ...subs[subIdx], [field]: value };
        services[svcIdx] = { ...services[svcIdx], sub_products: subs };
        setServices(services);
    };
    const removeSubProduct = (svcIdx: number, subIdx: number) => {
        const services = [...data.services];
        services[svcIdx] = {
            ...services[svcIdx],
            sub_products: (services[svcIdx].sub_products ?? []).filter((_: any, idx: number) => idx !== subIdx),
        };
        setServices(services);
    };

    // Produk dipilih manual (bukan dari kontrak) → unit diambil dari uom_id default produk.
    const productUomId = (product: any) => product?.unit_of_measure_id ?? null;
    const productUomLabel = (product: any) =>
        uomLabel(uoms?.find((u: any) => String(u.id) === String(product?.unit_of_measure_id)), product?.unit);

    const handleSelectProduct = (product: any) => {
        if (!pickerTarget) return;
        const { svcIdx, subIdx } = pickerTarget;
        if (subIdx === undefined) {
            const services = [...data.services];
            const cur = services[svcIdx];
            services[svcIdx] = {
                ...cur,
                product_id: product.id,
                uom:        cur.uom || productUomLabel(product),
                uom_id:     cur.uom_id || productUomId(product),
                unit_price: cur.unit_price || product.sales_price || product.price || '',
                tax_rate:   cur.tax_rate > 0 ? cur.tax_rate : taxRateSo,
            };
            setServices(services);
        } else {
            updateSubProduct(svcIdx, subIdx, 'product_id', product.id);
            updateSubProduct(svcIdx, subIdx, 'uom', productUomLabel(product));
            updateSubProduct(svcIdx, subIdx, 'uom_id', productUomId(product));
        }
        setPickerTarget(null);
    };

    // Memilih kontrak baru: reset premis & item, item baru terisi setelah premis dipilih.
    const handleSelectContract = (contract: any) => {
        setData({
            ...data,
            contract_id:         contract.id,
            contract_premise_id: '',
            customer_id:         contract.customer_id ?? data.customer_id,
            services:            [],
        });
    };

    // Memilih premis: item service terisi dari produk premis × durasi kontrak (per bulan),
    // dan visit plan dibuat sebanyak visit frequency premis.
    const handleSelectPremise = (premise: any) => {
        setData({
            ...data,
            contract_premise_id: premise.id,
            services:            servicesFromPremise(premise, selectedContract?.duration_months, taxRateSo),
            visit_plans:         makeVisitPlans(Number(premise.visit_frequency) || 0),
        });
    };

    const updateVisitPlan = (i: number, field: 'visit_date', value: any) => {
        const plans = [...data.visit_plans];
        plans[i] = { ...plans[i], [field]: value };
        setData('visit_plans', plans);
    };
    const addVisitPlan = () => {
        const maxNo = data.visit_plans.reduce((m: number, p: any) => Math.max(m, Number(p.visit_number) || 0), 0);
        setData('visit_plans', [...data.visit_plans, { visit_number: maxNo + 1, visit_date: '', quantity: '' }]);
    };
    const removeVisitPlan = (i: number) =>
        setData('visit_plans', data.visit_plans.filter((_: any, idx: number) => idx !== i));

    const lineTax = (svc: any) => {
        const sub  = Number(svc.quantity || 0) * Number(svc.unit_price || 0);
        const rate = Number(svc.tax_rate || 0);
        if (rate <= 0) return 0;
        return taxType === 'exclude' ? sub * rate / 100 : sub * rate / (100 + rate);
    };
    const lineTotal = (svc: any) => {
        const sub = Number(svc.quantity || 0) * Number(svc.unit_price || 0);
        return taxType === 'exclude' ? sub + lineTax(svc) : sub;
    };

    const subtotalAll = data.services.reduce((s: number, svc: any) => s + Number(svc.quantity || 0) * Number(svc.unit_price || 0), 0);
    const taxAll      = data.services.reduce((s: number, svc: any) => s + lineTax(svc), 0);
    const grandTotal  = taxType === 'exclude' ? subtotalAll + taxAll : subtotalAll;
    const baseAmount  = taxType === 'include' ? subtotalAll - taxAll : subtotalAll;

    const colCount = taxType === 'exclude' ? 8 : 7;

    // Kelompokkan service per periode bulan, simpan index aslinya untuk handler.
    const groups = (() => {
        const map = new Map<number, { svc: any; idx: number }[]>();
        data.services.forEach((svc: any, idx: number) => {
            const m = Number(svc.month) || 1;
            if (!map.has(m)) map.set(m, []);
            map.get(m)!.push({ svc, idx });
        });
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    })();

    // Rencana kunjungan diambil dari visit frequency premis (tanpa dikalikan durasi).
    const visitFreq = Number(selectedPremise?.visit_frequency) || 0;

    // ── Data Work Order (untuk validasi & info pada form edit) ──────────────
    // Bulan diambil dari Referensi Bulan WO (wo.month); fallback ke bulan kontrak
    // dari visit_date untuk WO lama yang belum punya kolom month. Nomor visit dari visit plan.
    const woInfo = useMemo(() => {
        const start    = selectedContract?.start_date;
        const duration = Number(selectedContract?.duration_months) > 0 ? Number(selectedContract.duration_months) : 1;
        return (workOrders ?? []).map((wo: any) => {
            const month = wo.month ?? (start && wo.visit_date ? contractMonthOf(start, dkey(wo.visit_date), duration) : null);
            const vp    = data.visit_plans.find((v: any) => v.visit_date && dkey(v.visit_date) === dkey(wo.visit_date));
            return { ...wo, month, visit_number: vp?.visit_number ?? null };
        });
    }, [workOrders, selectedContract, data.visit_plans]);

    // WO dikelompokkan per bulan (untuk badge pada header bulan service items).
    const woByMonth = useMemo(() => {
        const map: Record<number, any[]> = {};
        woInfo.forEach((wo: any) => {
            if (wo.month == null) return;
            (map[wo.month] ??= []).push(wo);
        });
        return map;
    }, [woInfo]);

    // Tanggal visit yang sudah memiliki WO Completed (Req 4: tanggal tidak boleh diubah).
    const completedVisitDates = useMemo(
        () => new Set(woInfo.filter((wo: any) => wo.status === 'completed' && wo.visit_date).map((wo: any) => dkey(wo.visit_date))),
        [woInfo],
    );

    // Bulan yang sudah memiliki minimal satu WO Completed (Req 2b).
    const monthsCompleted = useMemo(
        () => new Set(woInfo.filter((wo: any) => wo.status === 'completed' && wo.month != null).map((wo: any) => wo.month)),
        [woInfo],
    );

    // Req 3: bulan terkunci bila jumlah WO ≥ jumlah tanggal visit plan pada bulan itu.
    // Menambah tanggal visit baru pada bulan tsb membuka kembali kunci (woCount < visitCount).
    const monthLocked = (month: number): boolean => {
        const visitCount = visitDatesForMonth(data.visit_plans, selectedContract, month).length;
        if (visitCount === 0) return false;
        const woCount = (woByMonth[month] ?? []).length;
        return woCount >= visitCount;
    };

    const soUsedByWO       = (workOrders ?? []).length > 0;
    const allMonths        = [...new Set(data.services.map((s: any) => Number(s.month) || 1))] as number[];
    const allMonthsCompleted = allMonths.length > 0 && allMonths.every(m => monthsCompleted.has(m));
    const cannotDraft      = editing && soUsedByWO;
    const cannotComplete   = editing && !allMonthsCompleted;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((d: any) => ({
            contract_id:         d.contract_id,
            contract_premise_id: d.contract_premise_id,
            customer_id:         d.customer_id,
            so_number:           d.so_number,
            order_date:          d.order_date,
            status:              d.status,
            notes:               d.notes,
            items:               flattenServices(d.services),
            visit_plans:         (d.visit_plans ?? []).filter((vp: any) => vp.visit_number),
        }));
        editing ? put(`/sales-orders/${salesOrder.id}`) : post('/sales-orders');
    };

    const renderServiceRows = (rows: { svc: any; idx: number }[], locked = false) =>
        rows.map(({ svc, idx }) => {
            const selectedProduct = getProduct(svc.product_id);
            const isService = !selectedProduct || selectedProduct?.product_type === 'service';
            const lockedInput = locked ? `${inputCls} bg-gray-100 cursor-not-allowed` : inputCls;
            return (
                <>
                    <tr key={`svc-${idx}`} className="align-top">
                        <td className="px-3 py-2">
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => setPickerTarget({ svcIdx: idx })}
                                className="w-full text-left px-3 py-1.5 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-100 disabled:cursor-not-allowed disabled:hover:border-gray-200"
                            >
                                {selectedProduct
                                    ? <span className="text-gray-800">{selectedProduct.name}</span>
                                    : <span className="text-gray-400">— Select Product —</span>
                                }
                            </button>
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{svc.uom || productUnit(selectedProduct) || '—'}</td>
                        <td className="px-3 py-2">
                            <input type="number" min={1} readOnly={locked} disabled={locked} className={lockedInput} value={svc.quantity} onChange={e => updateService(idx, 'quantity', +e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                            <input type="number" readOnly={locked} disabled={locked} className={lockedInput} value={svc.unit_price} onChange={e => updateService(idx, 'unit_price', +e.target.value)} placeholder={selectedProduct?.sales_price ?? ''} />
                        </td>
                        <td className="px-3 py-2">
                            <input type="number" min={0} max={100} step="0.1" readOnly={locked} disabled={locked} className={lockedInput} value={svc.tax_rate} onChange={e => updateService(idx, 'tax_rate', +e.target.value)} placeholder="0" />
                        </td>
                        {taxType === 'exclude' && (
                            <td className="px-3 py-2 text-right text-amber-600 text-xs whitespace-nowrap">
                                {lineTax(svc) > 0 ? fmt(lineTax(svc)) : '—'}
                            </td>
                        )}
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                            {fmt(lineTotal(svc))}
                            {taxType === 'include' && lineTax(svc) > 0 && (
                                <div className="text-xs text-gray-400">Tax: {fmt(lineTax(svc))}</div>
                            )}
                        </td>
                        <td className="px-3 py-2">
                            {!locked && (
                                <button type="button" onClick={() => removeService(idx)} className="text-red-500 text-lg leading-none hover:text-red-700">×</button>
                            )}
                        </td>
                    </tr>

                    {isService && (
                        <tr key={`sub-${idx}`} className="bg-blue-50">
                            <td colSpan={colCount} className="px-4 py-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-blue-700">Service Sub-Products</span>
                                    {!locked && (
                                        <button type="button" onClick={() => addSubProduct(idx)} className="text-xs text-blue-600 hover:underline">+ Add Sub-Product</button>
                                    )}
                                </div>
                                {(svc.sub_products ?? []).length === 0 && (
                                    <p className="text-xs text-blue-400 italic">No sub-products yet.</p>
                                )}
                                {(svc.sub_products ?? []).length > 0 && (
                                    <table className="w-full text-xs mt-1">
                                        <thead>
                                            <tr className="text-left text-blue-600 border-b border-blue-100">
                                                <th className="pb-1 pr-2">Product</th>
                                                <th className="pb-1 w-16 pr-2">Unit</th>
                                                <th className="pb-1 w-24 pr-2">Qty</th>
                                                <th className="pb-1 w-24">Qty WO</th>
                                                <th className="pb-1 w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-100">
                                            {svc.sub_products.map((sub: any, si: number) => {
                                                const subProduct = getProduct(sub.product_id);
                                                return (
                                                    <tr key={si}>
                                                        <td className="py-1 pr-2">
                                                            <button
                                                                type="button"
                                                                disabled={locked}
                                                                onClick={() => setPickerTarget({ svcIdx: idx, subIdx: si })}
                                                                className="w-full text-left px-2 py-1 border rounded text-xs bg-white hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                            >
                                                                {subProduct ? <span className="text-gray-800">{subProduct.name}</span> : <span className="text-gray-400">— Select Product —</span>}
                                                            </button>
                                                        </td>
                                                        <td className="py-1 pr-2 text-gray-500">{sub.uom || productUnit(subProduct) || '—'}</td>
                                                        <td className="py-1 pr-2">
                                                            <input type="number" min={1} readOnly={locked} disabled={locked} className={lockedInput} value={sub.quantity} onChange={e => updateSubProduct(idx, si, 'quantity', +e.target.value)} />
                                                        </td>
                                                        <td className="py-1 pr-2">
                                                            <span className="inline-block w-full px-2 py-1 rounded bg-gray-100 text-gray-700 text-center font-medium">
                                                                {subWoQty(svc.product_id, sub.product_id, svc.month)}
                                                            </span>
                                                        </td>
                                                        <td className="py-1">
                                                            {!locked && (
                                                                <button type="button" onClick={() => removeSubProduct(idx, si)} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </td>
                        </tr>
                    )}
                </>
            );
        });

    return (
        <AppLayout header={editing ? 'Edit Sales Order' : 'Create Sales Order'}>
            <Head title="Sales Order" />

            {pickerTarget && (
                <ProductPickerModal
                    products={products ?? []}
                    onSelect={handleSelectProduct}
                    onClose={() => setPickerTarget(null)}
                    extraLabel="Sales Price"
                    extraKey="sales_price"
                    extraFormat="currency"
                    typeFilter="goods"
                />
            )}

            {contractPickerOpen && (
                <ContractPickerModal
                    contracts={contracts ?? []}
                    onSelect={handleSelectContract}
                    onClose={() => setContractPickerOpen(false)}
                />
            )}

            {premisePickerOpen && (
                <PremisePickerModal
                    premises={premiseOptions}
                    onSelect={handleSelectPremise}
                    onClose={() => setPremisePickerOpen(false)}
                    usedIds={usedPremiseIds}
                />
            )}

            <div className="max-w-5xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    <div className="grid grid-cols-3 gap-4">
                        <FormField label="SO No." error={errors.so_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.so_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Order Date" error={errors.order_date} required>
                            <input type="date" className={inputCls} value={data.order_date} onChange={e => setData('order_date', e.target.value)} />
                        </FormField>
                        <FormField label="Status" error={errors.status}>
                            <select
                                className={inputCls}
                                value={data.status}
                                onChange={e => {
                                    const v = e.target.value;
                                    if (v === 'draft' && cannotDraft) return;
                                    if (v === 'completed' && cannotComplete) return;
                                    setData('status', v);
                                }}
                            >
                                <option value="draft" disabled={cannotDraft}>Draft</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed" disabled={cannotComplete}>Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            {cannotDraft && data.status !== 'draft' && (
                                <p className="text-xs text-amber-600 mt-1">SO sudah dipakai Work Order — tidak bisa kembali ke Draft.</p>
                            )}
                            {cannotComplete && data.status !== 'completed' && (
                                <p className="text-xs text-amber-600 mt-1">Completed terbuka bila semua bulan punya WO Completed.</p>
                            )}
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Contract Reference">
                            <button
                                type="button"
                                disabled={editing}
                                onClick={() => setContractPickerOpen(true)}
                                className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-50 disabled:cursor-default disabled:hover:border-gray-200"
                            >
                                {selectedContract
                                    ? <span className="text-gray-800">{selectedContract.contract_number}</span>
                                    : <span className="text-gray-400">— Pilih Kontrak —</span>
                                }
                            </button>
                            {selectedContract && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Periode: {selectedContract.duration_months ?? '—'} bulan
                                    {editing ? ' — terkunci saat edit' : ' — pilih premis untuk mengisi item otomatis'}
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

                    <FormField label="Referensi Premis" error={errors.contract_premise_id}>
                        <button
                            type="button"
                            disabled={!selectedContract || editing}
                            onClick={() => setPremisePickerOpen(true)}
                            className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                            {selectedPremise
                                ? <span className="text-gray-800">{selectedPremise.location}</span>
                                : <span className="text-gray-400">{selectedContract ? '— Pilih Premis —' : 'Pilih kontrak terlebih dahulu'}</span>
                            }
                        </button>
                        {selectedPremise && (
                            <div className="mt-2 grid grid-cols-4 gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                                <div><span className="text-gray-500 block">Lokasi</span><span className="text-gray-800 font-medium">{selectedPremise.location ?? '—'}</span></div>
                                <div><span className="text-gray-500 block">Alamat</span><span className="text-gray-800 font-medium">{selectedPremise.address ?? '—'}</span></div>
                                <div><span className="text-gray-500 block">PIC</span><span className="text-gray-800 font-medium">{selectedPremise.pic ?? '—'}</span></div>
                                <div><span className="text-gray-500 block">Visit Frequency</span><span className="text-emerald-700 font-semibold">{selectedPremise.visit_frequency ?? 0}×</span></div>
                            </div>
                        )}
                    </FormField>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-700">Service Items</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-1">
                                Tax: <strong>{taxType === 'exclude' ? 'Tax Exclusive' : 'Tax Inclusive'}</strong>
                            </span>
                        </div>

                        {groups.length === 0 && (
                            <p className="text-sm text-gray-400 italic mb-2">Belum ada item. Pilih kontrak lalu pilih premis untuk mengisi otomatis, atau tambah periode bulan.</p>
                        )}

                        <div className="space-y-3">
                            {groups.map(([month, rows]) => {
                                const isCollapsed   = !!collapsed[month];
                                const monthSubtotal = rows.reduce((s, { svc }) => s + Number(svc.quantity || 0) * Number(svc.unit_price || 0), 0);
                                const monthWos      = woByMonth[month] ?? [];
                                // Req: bulan dengan Work Order Completed tidak bisa diubah item service-nya.
                                const completedLocked = monthsCompleted.has(month);
                                const locked        = monthLocked(month) || completedLocked;
                                return (
                                    <div key={month} className="border rounded-lg overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => toggleMonth(month)}
                                            className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-200 px-4 py-2 text-left transition"
                                        >
                                            <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-700">
                                                <span className="text-gray-400 w-3 inline-block">{isCollapsed ? '▶' : '▼'}</span>
                                                Bulan {month}
                                                <span className="text-xs font-normal text-gray-400">({rows.length} item)</span>
                                                {locked && (
                                                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">🔒 Terkunci</span>
                                                )}
                                                {monthWos.map((wo: any) => (
                                                    <span key={wo.id} className={`text-[10px] font-normal px-2 py-0.5 rounded-full ${woBadgeCls(wo.status)}`}>
                                                        {wo.visit_number ? `Visit ${wo.visit_number}` : 'WO'}
                                                        {wo.visit_date ? ` · ${dkey(wo.visit_date)}` : ''} · {wo.status}
                                                    </span>
                                                ))}
                                            </span>
                                            <span className="text-xs text-gray-500">Subtotal: <span className="font-medium text-gray-700">{fmt(monthSubtotal)}</span></span>
                                        </button>

                                        {!isCollapsed && (
                                            <div className="overflow-x-auto">
                                                {locked && (
                                                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
                                                        {completedLocked
                                                            ? 'Bulan ini sudah memiliki Work Order berstatus Completed. Item service tidak dapat diubah.'
                                                            : 'Semua tanggal visit bulan ini sudah memiliki Work Order. Item terkunci — tambahkan tanggal visit baru pada Visit Plan untuk membukanya.'}
                                                    </div>
                                                )}
                                                <table className="w-full text-sm min-w-[820px]">
                                                    <thead className="bg-gray-50 border-b">
                                                        <tr className="text-left text-gray-600 text-xs">
                                                            <th className="px-3 py-2">Product</th>
                                                            <th className="px-3 py-2 w-16">Unit</th>
                                                            <th className="px-3 py-2 w-20">Qty</th>
                                                            <th className="px-3 py-2 w-36">Unit Price</th>
                                                            <th className="px-3 py-2 w-20 text-center">Tax %</th>
                                                            {taxType === 'exclude' && <th className="px-3 py-2 w-28 text-right">Tax (Rp)</th>}
                                                            <th className="px-3 py-2 w-32 text-right">Subtotal</th>
                                                            <th className="px-3 py-2 w-8"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {renderServiceRows(rows, locked)}
                                                    </tbody>
                                                </table>
                                                {!locked && (
                                                    <div className="px-4 py-2 bg-gray-50 border-t">
                                                        <button type="button" onClick={() => addServiceToMonth(month)} className="text-xs text-red-600 hover:underline">+ Add Product</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button type="button" onClick={addPeriod} className="mt-3 text-sm text-red-600 hover:underline">+ Tambah Periode Bulan</button>

                        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                            <div className="flex w-72 justify-between text-gray-600">
                                <span>{taxType === 'include' ? 'Pre-Tax Amount' : 'Subtotal'}</span>
                                <span>{fmt(baseAmount)}</span>
                            </div>
                            <div className="flex w-72 justify-between text-gray-600">
                                <span>Pajak</span>
                                <span className="text-amber-600">{fmt(taxAll)}</span>
                            </div>
                            <div className="flex w-72 justify-between font-semibold text-gray-900">
                                <span>{taxType === 'exclude' ? 'Grand Total (incl. Tax)' : 'Total'}</span>
                                <span className="text-emerald-700">{fmt(grandTotal)}</span>
                            </div>
                            <div className="flex w-72 justify-between text-gray-600 border-t pt-1 mt-1">
                                <span title="Total invoice SO ini yang sudah dibayar (payment Verified)">Settlement Amount</span>
                                <span className="text-blue-700 font-medium">{fmt(settlementAmountNum)}</span>
                            </div>
                            <div className="flex w-72 justify-between font-semibold text-gray-900">
                                <span title="Grand Total dikurangi Settlement Amount">Sisa Nilai Pekerjaan</span>
                                <span className="text-rose-700">{fmt(grandTotal - settlementAmountNum)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Visit Plan (mengikuti visit frequency premis) ───── */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-700">Visit Plan</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">{data.visit_plans.length} kunjungan</span>
                                <button
                                    type="button"
                                    onClick={addVisitPlan}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    + Tambah Visit
                                </button>
                                {visitFreq > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setData('visit_plans', makeVisitPlans(visitFreq))}
                                        className="text-xs text-red-600 hover:underline"
                                    >
                                        ↻ Generate dari Visit Frequency ({visitFreq}×)
                                    </button>
                                )}
                            </div>
                        </div>
                        {data.visit_plans.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Belum ada rencana kunjungan. Pilih premis dengan <strong>Visit Frequency</strong> pada kontrak.</p>
                        ) : (
                            <div className="border rounded-lg overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr className="text-left text-gray-600 text-xs">
                                            <th className="px-3 py-2 w-16 text-center">No.</th>
                                            <th className="px-3 py-2">Lokasi</th>
                                            <th className="px-3 py-2 w-40 text-center">Kunjungan Ke-</th>
                                            <th className="px-3 py-2 w-48">Tanggal Visit</th>
                                            <th className="px-3 py-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.visit_plans.map((row: any, i: number) => {
                                            const dateLocked = !!row.visit_date && completedVisitDates.has(dkey(row.visit_date));
                                            return (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-3 py-1.5 text-center text-gray-600">{i + 1}</td>
                                                <td className="px-3 py-1.5 text-gray-800">{selectedPremise?.location ?? '—'}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Visit {row.visit_number}</span>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="date"
                                                        readOnly={dateLocked}
                                                        disabled={dateLocked}
                                                        className={dateLocked ? `${inputCls} bg-gray-100 cursor-not-allowed` : inputCls}
                                                        value={row.visit_date ?? ''}
                                                        onChange={e => updateVisitPlan(i, 'visit_date', e.target.value)}
                                                    />
                                                    {dateLocked && (
                                                        <span className="text-[10px] text-emerald-600">🔒 WO Completed — tanggal terkunci</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    {!dateLocked && (
                                                        <button type="button" onClick={() => removeVisitPlan(i)} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                                                    )}
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <FormField label="Notes">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                        <Link href="/sales-orders" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

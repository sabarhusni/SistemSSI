import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ProductPickerModal from '@/Components/ProductPickerModal';
import CustomerPickerModal from '@/Components/CustomerPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { Fragment, useState, useEffect } from 'react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// Add a whole number of months to a date, clamping day-of-month overflow (e.g. Jan 31 + 1 → Feb 28).
function addMonths(dateStr: string, months: number): string {
    if (!dateStr || !months || months < 1) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    d.setMonth(d.getMonth() + Number(months));
    if (d.getDate() < day) d.setDate(0);
    const y  = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
}

// Derive the month count between two dates (inverse of addMonths) for editing existing contracts.
function monthsBetween(start: string, end: string): number | '' {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
    let m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) m -= 1;
    return m > 0 ? m : '';
}

export default function Form({ contract, customers, products, employees, taxType = 'exclude', taxRateSo = 11, locked = false }: any) {
    const editing = !!contract;

    const emptySub = () => ({ product_id: '', quantity: 1 });
    const emptyProduct = () => ({
        product_id: '', quantity: 1, unit_price: '', total_price: 0,
        tax_rate: taxRateSo, tax_amount: 0, location_note: '', sub_products: [] as any[],
    });
    const emptyPremise = () => ({ location: '', address: '', pic: '', phone: '', email: '', visit_frequency: 1, products: [emptyProduct()] });

    const { data, setData, post, put, processing, errors } = useForm<any>({
        customer_id:          contract?.customer_id          ?? '',
        contract_number:      contract?.contract_number      ?? '',
        start_date:           contract?.start_date           ?? '',
        end_date:             contract?.end_date             ?? '',
        duration_months:      contract?.duration_months ?? (contract ? monthsBetween(contract.start_date, contract.end_date) : ''),
        contract_value:       contract?.contract_value       ?? '',
        is_manual_contract_value: contract?.is_manual_contract_value ?? false,
        invoice_frequency:    contract?.invoice_frequency    ?? 1,
        status:               contract?.status               ?? 'draft',
        service_type:         contract?.service_type         ?? '',
        is_unique_pest:       contract?.is_unique_pest       ?? false,
        notes:                contract?.notes                ?? '',
        sales_type:           contract?.sales_type           ?? '',
        sales_employee_id:    contract?.sales_employee_id    ?? '',
        lead_employee_id:     contract?.lead_employee_id     ?? '',
        premises: contract?.premises?.map((p: any) => ({
            location: p.location ?? '',
            address:  p.address  ?? '',
            pic:      p.pic      ?? '',
            phone:    p.phone    ?? '',
            email:    p.email    ?? '',
            visit_frequency: p.visit_frequency ?? 1,
            products: (p.services ?? []).map((s: any) => ({
                product_id:      s.product_id,
                // Kolom desimal Postgres terbawa sebagai string — paksa ke number
                // agar penjumlahan total tidak menjadi konkatenasi string saat edit.
                quantity:        Number(s.quantity) || 0,
                unit_price:      Number(s.unit_price) || 0,
                total_price:     Number(s.total_price) || 0,
                tax_rate:        s.tax_rate != null ? Number(s.tax_rate) : taxRateSo,
                tax_amount:      Number(s.tax_amount) || 0,
                location_note:   s.location ?? '',
                sub_products:    (s.sub_products ?? s.subProducts ?? []).map((sp: any) => ({
                    product_id: sp.product_id,
                    quantity:   Number(sp.quantity) || 0,
                })),
            })),
        })) ?? [emptyPremise()],
    });

    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const selectedCustomer = customers?.find((c: any) => String(c.id) === String(data.customer_id));

    const [pickerTarget, setPickerTarget] = useState<{ premIdx: number; prodIdx: number; subIdx?: number } | null>(null);
    const [duplicateError, setDuplicateError] = useState('');

    const getProduct = (id: string) => products?.find((p: any) => p.id === id);
    const productUnit = (p: any) => p?.unit_of_measure?.symbol ?? p?.unit ?? '';

    // Product category shown in the picker follows the selected Services option.
    const serviceCategory = data.service_type === 'pest_control' ? 'Pest Control'
        : data.service_type === 'scenting' ? 'Scenting'
        : undefined;

    // Ubah Nilai Kontrak hanya berlaku untuk kontrak Pest Control dengan Hama Unik.
    const canManualContractValue = data.service_type === 'pest_control' && data.is_unique_pest;

    // Per-line tax, honoring global tax type (exclude: added on top | include: embedded).
    const lineTax = (sub: number, rate: number) =>
        rate <= 0 ? 0
            : taxType === 'exclude'
                ? sub * rate / 100
                : sub * rate / (100 + rate);

    const recalcProduct = (prod: any) => {
        const sub = (prod.quantity || 0) * (prod.unit_price || 0);
        return { ...prod, total_price: sub, tax_amount: lineTax(sub, prod.tax_rate || 0) };
    };

    // End Date auto-fills from Start Date + duration (months).
    useEffect(() => {
        const end = addMonths(data.start_date, Number(data.duration_months));
        if (end && end !== data.end_date) setData('end_date', end);
    }, [data.start_date, data.duration_months]);

    // ── Premise helpers ────────────────────────────────────────────────────
    const setPremises = (premises: any[]) => setData('premises', premises);

    // Ganti Services (Pest Control/Scenting) → produk yang sudah dipilih tidak lagi
    // relevan dengan kategori baru, jadi reset ke satu baris produk kosong per premis.
    // Ubah Nilai Kontrak hanya berlaku untuk Pest Control + Hama Unik, jadi ikut direset.
    const handleServiceTypeChange = (val: string) => {
        setData({
            ...data,
            service_type: val,
            is_unique_pest: val === 'pest_control' ? data.is_unique_pest : false,
            is_manual_contract_value: val === 'pest_control' ? data.is_manual_contract_value : false,
            premises: data.premises.map((p: any) => ({ ...p, products: [emptyProduct()] })),
        });
    };

    const updatePremise = (pi: number, field: string, value: any) => {
        const premises = [...data.premises];
        premises[pi] = { ...premises[pi], [field]: value };
        setPremises(premises);
    };
    const addPremise = () => setPremises([...data.premises, emptyPremise()]);
    const removePremise = (pi: number) => setPremises(data.premises.filter((_: any, idx: number) => idx !== pi));

    // ── Product (level 2) helpers ──────────────────────────────────────────
    const updateProduct = (pi: number, di: number, field: string, value: any) => {
        const premises = [...data.premises];
        const products = [...premises[pi].products];
        products[di] = recalcProduct({ ...products[di], [field]: value });
        premises[pi] = { ...premises[pi], products };
        setPremises(premises);
    };
    const addProduct = (pi: number) => {
        const premises = [...data.premises];
        premises[pi] = { ...premises[pi], products: [...premises[pi].products, emptyProduct()] };
        setPremises(premises);
    };
    const removeProduct = (pi: number, di: number) => {
        const premises = [...data.premises];
        premises[pi] = { ...premises[pi], products: premises[pi].products.filter((_: any, idx: number) => idx !== di) };
        setPremises(premises);
    };

    // ── Sub-product (level 3) helpers ──────────────────────────────────────
    const addSubProduct = (pi: number, di: number) => {
        const premises = [...data.premises];
        const products = [...premises[pi].products];
        products[di] = { ...products[di], sub_products: [...(products[di].sub_products ?? []), emptySub()] };
        premises[pi] = { ...premises[pi], products };
        setPremises(premises);
    };
    const updateSubProduct = (pi: number, di: number, si: number, field: string, value: any) => {
        const premises = [...data.premises];
        const products = [...premises[pi].products];
        const subs = [...(products[di].sub_products ?? [])];
        subs[si] = { ...subs[si], [field]: value };
        products[di] = { ...products[di], sub_products: subs };
        premises[pi] = { ...premises[pi], products };
        setPremises(premises);
    };
    const removeSubProduct = (pi: number, di: number, si: number) => {
        const premises = [...data.premises];
        const products = [...premises[pi].products];
        products[di] = { ...products[di], sub_products: (products[di].sub_products ?? []).filter((_: any, idx: number) => idx !== si) };
        premises[pi] = { ...premises[pi], products };
        setPremises(premises);
    };

    const handleSelectProduct = (product: any) => {
        if (pickerTarget === null) return;
        const { premIdx, prodIdx, subIdx } = pickerTarget;
        const premises = [...data.premises];
        const products = [...premises[premIdx].products];

        if (subIdx !== undefined) {
            const subs = [...(products[prodIdx].sub_products ?? [])];
            subs[subIdx] = { ...subs[subIdx], product_id: product.id };
            products[prodIdx] = { ...products[prodIdx], sub_products: subs };
        } else {
            const cur = products[prodIdx];
            products[prodIdx] = recalcProduct({
                ...cur,
                product_id: product.id,
                unit_price: cur.unit_price || product.sales_price || product.price || 0,
                tax_rate:   cur.tax_rate > 0 ? cur.tax_rate : taxRateSo,
            });
        }
        premises[premIdx] = { ...premises[premIdx], products };
        setPremises(premises);
    };

    // ── Totals (all premises → products). Visit freq is informational only. ──
    const allProducts = data.premises.flatMap((p: any) => p.products ?? []);
    const subtotalMonthly = allProducts.reduce((s: number, it: any) => s + (it.total_price || 0), 0);
    const taxMonthly      = allProducts.reduce((s: number, it: any) => s + (it.tax_amount  || 0), 0);
    const preTaxMonthly   = taxType === 'include' ? subtotalMonthly - taxMonthly : subtotalMonthly;
    const grandMonthly    = taxType === 'exclude' ? subtotalMonthly + taxMonthly : subtotalMonthly;
    const months          = Number(data.duration_months) || 0;
    const computedValue   = grandMonthly * months;

    // Contract Value auto-fills: grand total (incl. tax) × duration in months — unless
    // manually overridden (Ubah Nilai Kontrak only applies to Pest Control + Hama Unik).
    useEffect(() => {
        if (canManualContractValue && data.is_manual_contract_value) return;
        if (computedValue !== (parseFloat(data.contract_value) || 0)) {
            setData('contract_value', computedValue);
        }
    }, [computedValue, data.is_manual_contract_value, canManualContractValue]);

    // When Contract Value is overridden manually, every product line (across all premises)
    // gets an equal share: (Contract Value ÷ Duration Months) ÷ jumlah produk. Visit
    // frequency is not counted. Re-runs whenever a product is added/removed so all rows
    // (old and new) stay in sync with the new per-product share.
    useEffect(() => {
        if (!canManualContractValue || !data.is_manual_contract_value || !months) return;
        const count = allProducts.length;
        if (!count) return;
        const newUnitPrice = (parseFloat(data.contract_value) || 0) / months / count;
        const changed = allProducts.some((p: any) => Math.abs((p.unit_price || 0) - newUnitPrice) > 0.0001);
        if (!changed) return;
        setPremises(data.premises.map((p: any) => ({
            ...p,
            products: (p.products ?? []).map((prod: any) => recalcProduct({ ...prod, unit_price: newUnitPrice })),
        })));
    }, [data.is_manual_contract_value, data.contract_value, months, canManualContractValue, allProducts.length]);

    // Incentive calculations
    const contractVal = parseFloat(data.contract_value) || 0;
    const canvasIncentive = data.sales_type === 'canvas' ? contractVal * 0.04 : 0;
    const leadSalesIncentive = data.sales_type === 'lead' ? contractVal * 0.02 : 0;
    const leadGiverIncentive = data.sales_type === 'lead' ? contractVal * 0.02 : 0;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // Product cannot be duplicated within the same premise.
        for (const prem of data.premises) {
            const ids = (prem.products ?? []).filter((p: any) => p.product_id).map((p: any) => p.product_id);
            if (ids.length !== new Set(ids).size) {
                setDuplicateError('Produk tidak boleh duplikat dalam satu premis.');
                return;
            }
        }
        setDuplicateError('');
        editing ? put(`/contracts/${contract.id}`) : post('/contracts');
    };

    const colSpanProduct = taxType === 'exclude' ? 9 : 8;

    return (
        <AppLayout header={editing ? 'Edit Contract' : 'Add Contract'}>
            <Head title={editing ? 'Edit Contract' : 'Add Contract'} />

            {customerPickerOpen && (
                <CustomerPickerModal
                    customers={customers ?? []}
                    onSelect={c => setData('customer_id', c.id)}
                    onClose={() => setCustomerPickerOpen(false)}
                />
            )}

            {pickerTarget !== null && (
                <ProductPickerModal
                    products={products ?? []}
                    onSelect={handleSelectProduct}
                    onClose={() => setPickerTarget(null)}
                    extraLabel="Sales Price"
                    extraKey="sales_price"
                    extraFormat="currency"
                    typeFilter={pickerTarget?.subIdx !== undefined ? 'goods' : 'service'}
                    categoryFilter={pickerTarget?.subIdx === undefined ? serviceCategory : undefined}
                    allowTypeToggle={pickerTarget?.subIdx === undefined}
                />
            )}

            <div className="max-w-6xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    {errors.contract && (
                        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {errors.contract}
                        </div>
                    )}

                    {locked && (
                        <div className="rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800">
                            Kontrak ini memiliki Sales Order yang masih aktif, sehingga hanya dapat dilihat (read-only) dan tidak dapat diubah.
                        </div>
                    )}

                    <fieldset disabled={locked} className="space-y-4 m-0 p-0 border-0 disabled:opacity-70">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Contract No." error={errors.contract_number} required>
                            <input className={inputCls} value={data.contract_number} onChange={e => setData('contract_number', e.target.value)} />
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                {data.status === 'completed' && <option value="completed">Completed</option>}
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </FormField>
                    </div>

                    <FormField label="Services" error={errors.service_type} required>
                        <div className="flex gap-6">
                            {[{ val: 'pest_control', label: 'Pest Control' }, { val: 'scenting', label: 'Scenting' }].map(opt => (
                                <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="service_type"
                                        value={opt.val}
                                        checked={data.service_type === opt.val}
                                        onChange={() => handleServiceTypeChange(opt.val)}
                                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm text-gray-700">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </FormField>

                    {data.service_type === 'pest_control' && (
                        <label className="flex items-center gap-2 -mt-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.is_unique_pest}
                                onChange={e => setData({
                                    ...data,
                                    is_unique_pest: e.target.checked,
                                    is_manual_contract_value: e.target.checked ? data.is_manual_contract_value : false,
                                })}
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700">Hama Unik</span>
                        </label>
                    )}

                    <FormField label="Customer" error={errors.customer_id} required>
                        <button
                            type="button"
                            onClick={() => setCustomerPickerOpen(true)}
                            className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                        >
                            {selectedCustomer
                                ? <span className="text-gray-800">{selectedCustomer.name}</span>
                                : <span className="text-gray-400">— Select Customer —</span>
                            }
                        </button>
                    </FormField>

                    <div className="grid grid-cols-4 gap-4">
                        <FormField label="Start Date" error={errors.start_date} required>
                            <input type="date" className={inputCls} value={data.start_date} onChange={e => setData('start_date', e.target.value)} />
                        </FormField>
                        <FormField label="Duration (Months)" error={errors.duration_months} required>
                            <input
                                type="number" min={1}
                                className={inputCls}
                                value={data.duration_months}
                                onChange={e => setData('duration_months', e.target.value === '' ? '' : +e.target.value)}
                            />
                        </FormField>
                        <FormField label="End Date" error={errors.end_date} required>
                            <input type="date" className={inputCls + ' bg-gray-50'} value={data.end_date} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Invoice Term Frequency" error={errors.invoice_frequency} required>
                            <input
                                type="number" min={1}
                                className={inputCls}
                                value={data.invoice_frequency}
                                onChange={e => setData('invoice_frequency', +e.target.value)}
                            />
                            <p className="text-xs text-gray-400 mt-1">Number of invoice billing terms</p>
                        </FormField>
                    </div>

                    {/* ── Premises (level 1) ───────────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-700">Premis & Produk</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-1">
                                Tax: <strong>{taxType === 'exclude' ? 'Tax Exclusive' : 'Tax Inclusive'}</strong>
                            </span>
                        </div>
                        {(duplicateError || errors.premises) && (
                            <div className="mb-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                                {duplicateError || errors.premises}
                            </div>
                        )}

                        <div className="space-y-4">
                            {data.premises.map((prem: any, pi: number) => (
                                <div key={pi} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-emerald-700">Premis #{pi + 1}</span>
                                        {data.premises.length > 1 && (
                                            <button type="button" onClick={() => removePremise(pi)} className="text-xs text-red-500 hover:text-red-700">× Hapus Premis</button>
                                        )}
                                    </div>

                                    {/* Level 1: Premise data */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField label="Lokasi" error={errors[`premises.${pi}.location`]} required>
                                            <input className={inputCls} value={prem.location} onChange={e => updatePremise(pi, 'location', e.target.value)} />
                                        </FormField>
                                        <FormField label="PIC">
                                            <input className={inputCls} value={prem.pic} onChange={e => updatePremise(pi, 'pic', e.target.value)} />
                                        </FormField>
                                    </div>
                                    <FormField label="Alamat Lokasi">
                                        <textarea rows={2} className={inputCls} value={prem.address} onChange={e => updatePremise(pi, 'address', e.target.value)} />
                                    </FormField>
                                    <div className="grid grid-cols-3 gap-3">
                                        <FormField label="No. Telp">
                                            <input className={inputCls} value={prem.phone} onChange={e => updatePremise(pi, 'phone', e.target.value)} />
                                        </FormField>
                                        <FormField label="Email" error={errors[`premises.${pi}.email`]}>
                                            <input type="email" className={inputCls} value={prem.email} onChange={e => updatePremise(pi, 'email', e.target.value)} />
                                        </FormField>
                                        <FormField label="Visit Frequency (per bulan)" error={errors[`premises.${pi}.visit_frequency`]}>
                                            <input type="number" min={0} className={inputCls} value={prem.visit_frequency} onChange={e => updatePremise(pi, 'visit_frequency', +e.target.value)} />
                                        </FormField>
                                    </div>

                                    {/* Level 2: Products */}
                                    <div className="border rounded-lg overflow-x-auto bg-white">
                                        <table className="w-full text-sm min-w-[960px]">
                                            <thead className="bg-gray-50 border-b">
                                                <tr className="text-left text-gray-600">
                                                    <th className="px-3 py-2 w-40">Product</th>
                                                    <th className="px-3 py-2 w-14">Unit</th>
                                                    <th className="px-3 py-2 w-24">Qty</th>
                                                    <th className="px-3 py-2 w-32">Sales Price</th>
                                                    <th className="px-3 py-2 w-20 text-center">Tax %</th>
                                                    {taxType === 'exclude' && <th className="px-3 py-2 w-24 text-right">Tax (Rp)</th>}
                                                    <th className="px-3 py-2 w-40">Keterangan</th>
                                                    <th className="px-3 py-2 w-20 text-right">Subtotal</th>
                                                    <th className="px-3 py-2 w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {(prem.products ?? []).length === 0 && (
                                                    <tr>
                                                        <td colSpan={colSpanProduct} className="px-3 py-4 text-center text-gray-400">
                                                            Belum ada produk. Klik "+ Tambah Produk".
                                                        </td>
                                                    </tr>
                                                )}
                                                {(prem.products ?? []).map((prod: any, di: number) => {
                                                    const selectedProduct = getProduct(prod.product_id);
                                                    return (
                                                        <Fragment key={di}>
                                                            <tr className="align-top">
                                                                <td className="px-3 py-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPickerTarget({ premIdx: pi, prodIdx: di })}
                                                                        className="w-full text-left px-3 py-1.5 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                                                                    >
                                                                        {selectedProduct
                                                                            ? <span className="text-gray-800">{selectedProduct.name}</span>
                                                                            : <span className="text-gray-400">— Select Product —</span>
                                                                        }
                                                                    </button>
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-500 text-xs">{productUnit(selectedProduct) || '—'}</td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        className={inputCls + (data.is_manual_contract_value ? ' bg-gray-50' : '')}
                                                                        value={prod.quantity}
                                                                        onChange={e => updateProduct(pi, di, 'quantity', +e.target.value)}
                                                                        disabled={data.is_manual_contract_value}
                                                                        title={data.is_manual_contract_value ? 'Qty dikunci selama Ubah Nilai Kontrak aktif' : undefined}
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input
                                                                        type="number"
                                                                        className={inputCls + (data.is_manual_contract_value ? ' bg-gray-50' : '')}
                                                                        value={prod.unit_price}
                                                                        onChange={e => updateProduct(pi, di, 'unit_price', +e.target.value)}
                                                                        placeholder={selectedProduct?.sales_price ?? ''}
                                                                        readOnly={data.is_manual_contract_value}
                                                                        title={data.is_manual_contract_value ? 'Dihitung otomatis dari Contract Value ÷ Duration Months ÷ jumlah produk' : undefined}
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <input type="number" min={0} max={100} step="0.1" className={inputCls} value={prod.tax_rate} onChange={e => updateProduct(pi, di, 'tax_rate', +e.target.value)} placeholder="0" />
                                                                </td>
                                                                {taxType === 'exclude' && (
                                                                    <td className="px-3 py-2 text-right text-amber-600 text-xs whitespace-nowrap">
                                                                        {prod.tax_amount > 0 ? fmt(prod.tax_amount) : '—'}
                                                                    </td>
                                                                )}
                                                                <td className="px-3 py-2">
                                                                    <input className={inputCls} value={prod.location_note} onChange={e => updateProduct(pi, di, 'location_note', e.target.value)} placeholder="Keterangan" />
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                                                                    {fmt(prod.total_price || 0)}
                                                                    {taxType === 'include' && prod.tax_amount > 0 && (
                                                                        <div className="text-xs text-gray-400">Tax: {fmt(prod.tax_amount)}</div>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <button type="button" onClick={() => removeProduct(pi, di)} className="text-red-500 text-lg leading-none hover:text-red-700">×</button>
                                                                </td>
                                                            </tr>

                                                            {/* Level 3: Sub-products */}
                                                            <tr className="bg-blue-50">
                                                                <td colSpan={colSpanProduct} className="px-4 py-2">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-xs font-semibold text-blue-700">Sub Produk</span>
                                                                        <button type="button" onClick={() => addSubProduct(pi, di)} className="text-xs text-blue-600 hover:underline">+ Tambah Sub Produk</button>
                                                                    </div>
                                                                    {(prod.sub_products ?? []).length === 0 && (
                                                                        <p className="text-xs text-blue-400 italic">Belum ada sub produk.</p>
                                                                    )}
                                                                    {(prod.sub_products ?? []).length > 0 && (
                                                                        <table className="w-full text-xs mt-1">
                                                                            <thead>
                                                                                <tr className="text-left text-blue-600 border-b border-blue-100">
                                                                                    <th className="pb-1 pr-2">Product</th>
                                                                                    <th className="pb-1 w-24 pr-2">Qty</th>
                                                                                    <th className="pb-1 w-16 pr-2">Unit</th>
                                                                                    <th className="pb-1 w-8"></th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-blue-100">
                                                                                {prod.sub_products.map((sub: any, si: number) => {
                                                                                    const subProduct = getProduct(sub.product_id);
                                                                                    return (
                                                                                        <tr key={si}>
                                                                                            <td className="py-1 pr-2">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => setPickerTarget({ premIdx: pi, prodIdx: di, subIdx: si })}
                                                                                                    className="w-full text-left px-2 py-1 border rounded text-xs bg-white hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                                                                                                >
                                                                                                    {subProduct ? <span className="text-gray-800">{subProduct.name}</span> : <span className="text-gray-400">— Select Product —</span>}
                                                                                                </button>
                                                                                            </td>
                                                                                            <td className="py-1 pr-2">
                                                                                                <input type="number" min={1} className={inputCls} value={sub.quantity} onChange={e => updateSubProduct(pi, di, si, 'quantity', +e.target.value)} />
                                                                                            </td>
                                                                                            <td className="py-1 pr-2 text-gray-500">{productUnit(subProduct) || '—'}</td>
                                                                                            <td className="py-1">
                                                                                                <button type="button" onClick={() => removeSubProduct(pi, di, si)} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        </Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button type="button" onClick={() => addProduct(pi)} className="text-sm text-red-600 hover:underline">+ Tambah Produk</button>
                                </div>
                            ))}
                        </div>

                        <button type="button" onClick={addPremise} className="mt-3 text-sm font-medium text-red-600 hover:underline">+ Tambah Premis</button>

                        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Pre-Tax Amount (per month)</span><span>{fmt(preTaxMonthly)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Tax Amount (per month)</span><span className="text-amber-600">{fmt(taxMonthly)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold text-gray-700">
                                <span>Total (per month, incl. tax)</span><span className="text-emerald-700">{fmt(grandMonthly)}</span>
                            </div>
                            <div className="pt-2 border-t border-emerald-200">
                                {canManualContractValue && (
                                    <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.is_manual_contract_value}
                                            onChange={e => setData('is_manual_contract_value', e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />
                                        <span className="text-sm text-gray-700">Ubah Nilai Kontrak</span>
                                    </label>
                                )}
                                <FormField label="Contract Value (Rp)" error={errors.contract_value} required>
                                    <input
                                        type="number"
                                        className={inputCls + (data.is_manual_contract_value ? '' : ' bg-white')}
                                        value={data.contract_value}
                                        onChange={e => setData('contract_value', e.target.value === '' ? '' : +e.target.value)}
                                        readOnly={!data.is_manual_contract_value}
                                        tabIndex={data.is_manual_contract_value ? undefined : -1}
                                    />
                                </FormField>
                                {data.is_manual_contract_value ? (
                                    <p className="text-xs text-emerald-700 mt-1">
                                        Sales price tiap produk dihitung ulang: {fmt(parseFloat(data.contract_value) || 0)} ÷ {months || 0} bulan ÷ {allProducts.length} produk = <strong>{fmt(months && allProducts.length ? (parseFloat(data.contract_value) || 0) / months / allProducts.length : 0)}</strong> / bulan / produk.
                                        {(!months || !allProducts.length) && <span className="text-amber-600"> Isi Duration Months &amp; tambahkan produk agar sales price bisa dihitung ulang.</span>}
                                    </p>
                                ) : (
                                    <p className="text-xs text-emerald-700 mt-1">
                                        {fmt(grandMonthly)} (per month, incl. tax) × {months || 0} month{months === 1 ? '' : 's'} = <strong>{fmt(computedValue)}</strong>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Sales Information (setelah Total Contract) ───────── */}
                    <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                        <h3 className="font-semibold text-gray-700 text-sm">Sales Information</h3>
                        <FormField label="Sales Type">
                            <div className="flex gap-6">
                                {[{ val: '', label: 'None' }, { val: 'canvas', label: 'Canvas' }, { val: 'lead', label: 'Lead' }].map(opt => (
                                    <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="sales_type"
                                            value={opt.val}
                                            checked={data.sales_type === opt.val}
                                            onChange={() => setData({ ...data, sales_type: opt.val, sales_employee_id: '', lead_employee_id: '' })}
                                            className="w-4 h-4 text-red-600 focus:ring-red-500"
                                        />
                                        <span className="text-sm text-gray-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </FormField>

                        {data.sales_type === 'canvas' && (
                            <div className="space-y-3">
                                <FormField label="Sales (Canvas)" error={errors.sales_employee_id} required>
                                    <select
                                        className={inputCls}
                                        value={data.sales_employee_id}
                                        onChange={e => setData('sales_employee_id', e.target.value)}
                                    >
                                        <option value="">— Select Employee —</option>
                                        {employees?.map((emp: any) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name}{emp.position ? ` — ${emp.position}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                                {data.sales_employee_id && (
                                    <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
                                        Canvas Sales Incentive: <strong>{fmt(canvasIncentive)}</strong> (4% of contract value)
                                    </div>
                                )}
                            </div>
                        )}

                        {data.sales_type === 'lead' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Sales" error={errors.sales_employee_id} required>
                                        <select
                                            className={inputCls}
                                            value={data.sales_employee_id}
                                            onChange={e => setData('sales_employee_id', e.target.value)}
                                        >
                                            <option value="">— Select Employee —</option>
                                            {employees?.map((emp: any) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.name}{emp.position ? ` — ${emp.position}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Lead Giver" error={errors.lead_employee_id} required>
                                        <select
                                            className={inputCls}
                                            value={data.lead_employee_id}
                                            onChange={e => setData('lead_employee_id', e.target.value)}
                                        >
                                            <option value="">— Select Employee —</option>
                                            {employees?.map((emp: any) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.name}{emp.position ? ` — ${emp.position}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                </div>
                                {(data.sales_employee_id || data.lead_employee_id) && (
                                    <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 space-y-1">
                                        {data.sales_employee_id && <div>Sales Incentive: <strong>{fmt(leadSalesIncentive)}</strong> (2% of contract value)</div>}
                                        {data.lead_employee_id && <div>Lead Giver Incentive: <strong>{fmt(leadGiverIncentive)}</strong> (2% of contract value)</div>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <FormField label="Notes">
                        <textarea rows={3} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>
                    </fieldset>

                    <div className="flex gap-3 pt-2">
                        {!locked && (
                            <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                                {processing ? 'Saving...' : 'Save'}
                            </button>
                        )}
                        <Link href="/contracts" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                            {locked ? 'Kembali' : 'Cancel'}
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

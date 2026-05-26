import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ProductPickerModal from '@/Components/ProductPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';

const VISIT_TYPES = [
    { value: 'routine',   label: 'Routine' },
    { value: 'complaint', label: 'Komplain' },
    { value: 'followup',  label: 'Follow Up' },
];

export default function Form({ workOrder, technicians, products, contracts, nextNumber }: any) {
    const editing = !!workOrder;

    const { data, setData, post, put, processing, errors } = useForm<any>({
        contract_id:      workOrder?.contract_id      ?? '',
        sales_order_id:   workOrder?.sales_order_id   ?? '',
        technician_id:    workOrder?.technician_id    ?? '',
        wo_number:        workOrder?.wo_number        ?? nextNumber ?? '',
        visit_date:       workOrder?.visit_date        ?? '',
        time_in:          workOrder?.time_in           ?? '',
        time_out:         workOrder?.time_out          ?? '',
        service_area:     workOrder?.service_area      ?? '',
        visit_types:      workOrder?.visit_types       ?? [],
        status:           workOrder?.status            ?? 'pending',
        technician_notes: workOrder?.technician_notes  ?? '',
        materials: workOrder?.materials ?? [],
    });

    const [pickerIdx, setPickerIdx] = useState<number | null>(null);
    const [duplicateError, setDuplicateError] = useState('');

    const getProduct = (id: string) => products?.find((p: any) => p.id === id);

    const updateMaterial = (i: number, field: string, value: any) => {
        const m = [...data.materials];
        m[i] = { ...m[i], [field]: value };
        setData('materials', m);
    };

    const handleSelectProduct = (product: any) => {
        if (pickerIdx === null) return;
        updateMaterial(pickerIdx, 'product_id', product.id);
    };

    const toggleVisitType = (val: string) => {
        const current: string[] = data.visit_types ?? [];
        setData('visit_types', current.includes(val) ? current.filter(v => v !== val) : [...current, val]);
    };

    const selectedContract = useMemo(
        () => contracts?.find((c: any) => c.id === data.contract_id),
        [contracts, data.contract_id]
    );

    // Auto-fill sales_order_id and service_area when contract changes
    useEffect(() => {
        if (!data.contract_id) return;
        const contract = contracts?.find((c: any) => c.id === data.contract_id);
        if (!contract) return;

        const firstSO = contract.sales_orders?.[0];
        setData((prev: any) => ({
            ...prev,
            sales_order_id: firstSO?.id ?? '',
            service_area:   prev.service_area || contract.service_area || '',
        }));
    }, [data.contract_id]);

    // Derived SO info from selected contract
    const linkedSO = useMemo(() => {
        if (!selectedContract) return null;
        return selectedContract.sales_orders?.find((s: any) => s.id === data.sales_order_id)
            ?? selectedContract.sales_orders?.[0]
            ?? null;
    }, [selectedContract, data.sales_order_id]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const filledIds = data.materials.filter((m: any) => m.product_id).map((m: any) => m.product_id);
        if (filledIds.length !== new Set(filledIds).size) {
            setDuplicateError('Produk tidak boleh duplikat dalam material work order.');
            return;
        }
        setDuplicateError('');
        editing ? put(`/work-orders/${workOrder.id}`) : post('/work-orders');
    };

    return (
        <AppLayout header={editing ? 'Edit Work Order' : 'Buat Work Order'}>
            <Head title="Work Order" />

            {pickerIdx !== null && (
                <ProductPickerModal
                    products={products ?? []}
                    onSelect={handleSelectProduct}
                    onClose={() => setPickerIdx(null)}
                    extraLabel="Stok"
                    extraKey="stock"
                    extraFormat="number"
                />
            )}

            <div className="max-w-4xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    {/* Row 1: No WO, Tgl, Status */}
                    <div className="grid grid-cols-3 gap-4">
                        <FormField label="No. WO" error={errors.wo_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.wo_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Tgl Kunjungan" error={errors.visit_date} required>
                            <input type="date" className={inputCls} value={data.visit_date} onChange={e => setData('visit_date', e.target.value)} />
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="pending">Menunggu</option>
                                <option value="in_progress">Dikerjakan</option>
                                <option value="completed">Selesai</option>
                                <option value="cancelled">Dibatalkan</option>
                            </select>
                        </FormField>
                    </div>

                    {/* Kontrak */}
                    <FormField label="No. Kontrak" error={errors.contract_id} required>
                        <select
                            className={inputCls}
                            value={data.contract_id}
                            onChange={e => setData('contract_id', e.target.value)}
                        >
                            <option value="">— Pilih Kontrak —</option>
                            {contracts?.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.contract_number} — {c.customer?.name ?? ''}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    {/* No. Sales Order — auto dari kontrak */}
                    <FormField label="No. Sales Order">
                        <div className={`${inputCls} bg-gray-50 cursor-default font-mono text-xs`}>
                            {linkedSO
                                ? <span className="text-gray-800 font-semibold">{linkedSO.so_number}</span>
                                : <span className="text-gray-400 italic font-sans text-sm">
                                    {data.contract_id ? 'Tidak ada SO aktif untuk kontrak ini' : 'Otomatis dari kontrak'}
                                  </span>
                            }
                        </div>
                        {linkedSO && (
                            <p className="text-xs text-gray-400 mt-1">Terisi otomatis dari kontrak yang dipilih</p>
                        )}
                    </FormField>

                    {/* Badges ref */}
                    {(selectedContract || linkedSO) && (
                        <div className="flex flex-wrap gap-2">
                            {selectedContract && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-1">
                                    Kontrak: <strong>{selectedContract.contract_number}</strong>
                                </span>
                            )}
                            {linkedSO && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1">
                                    SO: <strong>{linkedSO.so_number}</strong>
                                </span>
                            )}
                        </div>
                    )}

                    {/* Teknisi */}
                    <FormField label="Teknisi" error={errors.technician_id}>
                        <select className={inputCls} value={data.technician_id} onChange={e => setData('technician_id', e.target.value)}>
                            <option value="">— Pilih Teknisi (opsional, diisi kemudian) —</option>
                            {technicians?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        {!data.technician_id && (
                            <p className="text-xs text-amber-500 mt-1">Teknisi dapat diisi/diubah oleh teknisi saat pelaksanaan.</p>
                        )}
                    </FormField>

                    {/* Area Layanan — auto dari kontrak */}
                    <FormField label="Area Layanan" error={errors.service_area} required>
                        <input
                            className={inputCls}
                            value={data.service_area}
                            onChange={e => setData('service_area', e.target.value)}
                            placeholder={selectedContract?.service_area ?? 'Isi area layanan'}
                        />
                        {selectedContract?.service_area && !data.service_area && (
                            <p className="text-xs text-gray-400 mt-1">Dari kontrak: {selectedContract.service_area}</p>
                        )}
                    </FormField>

                    {/* Time In & Time Out */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Time In (diisi teknisi)">
                            <input type="time" className={inputCls} value={data.time_in} onChange={e => setData('time_in', e.target.value)} />
                        </FormField>
                        <FormField label="Time Out (diisi teknisi)">
                            <input type="time" className={inputCls} value={data.time_out} onChange={e => setData('time_out', e.target.value)} />
                        </FormField>
                    </div>

                    {/* Tipe Kunjungan */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Kunjungan</label>
                        <div className="flex gap-6">
                            {VISIT_TYPES.map(vt => (
                                <label key={vt.value} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={(data.visit_types ?? []).includes(vt.value)}
                                        onChange={() => toggleVisitType(vt.value)}
                                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-700">{vt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Materials */}
                    <h3 className="font-semibold text-gray-700 mt-4 mb-2">Material Digunakan</h3>
                    {(duplicateError || errors.materials) && (
                        <div className="mb-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                            {duplicateError || errors.materials}
                        </div>
                    )}
                    <div className="border rounded-lg overflow-hidden mb-2">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-left text-gray-600">
                                    <th className="px-3 py-2">Produk / Material</th>
                                    <th className="px-3 py-2 w-28">Qty Digunakan</th>
                                    <th className="px-3 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.materials.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-3 py-3 text-center text-gray-400 text-xs">Belum ada material.</td>
                                    </tr>
                                )}
                                {data.materials.map((m: any, i: number) => {
                                    const selected = getProduct(m.product_id);
                                    return (
                                        <tr key={i}>
                                            <td className="px-3 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPickerIdx(i)}
                                                    className="w-full text-left px-3 py-1.5 border rounded-md text-sm bg-white hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                                                >
                                                    {selected
                                                        ? <span className="text-gray-800">{selected.name} <span className="text-gray-400 text-xs">(Stok: {selected.stock})</span></span>
                                                        : <span className="text-gray-400">— Pilih Material —</span>
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" min={1} className={inputCls} value={m.quantity_used} onChange={e => updateMaterial(i, 'quantity_used', +e.target.value)} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <button type="button" onClick={() => setData('materials', data.materials.filter((_: any, idx: number) => idx !== i))} className="text-red-500 text-lg">×</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={() => setData('materials', [...data.materials, { product_id: '', quantity_used: 1 }])}
                        className="text-sm text-emerald-600 hover:underline mb-4"
                    >
                        + Tambah Material
                    </button>

                    <FormField label="Catatan Teknisi">
                        <textarea rows={3} className={inputCls} value={data.technician_notes} onChange={e => setData('technician_notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/work-orders" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

import { Head, Link } from '@inertiajs/react';
import { Fragment, useEffect } from 'react';

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const statusLabel: Record<string, string> = {
    pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

const visitTypeLabel: Record<string, string> = {
    routine: 'Routine', complaint: 'Complaint', followup: 'Follow Up',
};

// Petakan tanggal visit ke nomor bulan kontrak (bulan 1 = bulan start_date).
function contractMonthOf(start: string, date: string, duration: number): number {
    const s = new Date(start), d = new Date(date);
    let diff = (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()) + 1;
    if (diff < 1) diff = 1;
    if (diff > duration) diff = duration;
    return diff;
}

function Row({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex text-sm py-1">
            <span className="w-40 shrink-0 text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium">: {value ?? '—'}</span>
        </div>
    );
}

export default function Print({ workOrder, companyName }: any) {
    useEffect(() => {
        const t = setTimeout(() => window.print(), 400);
        return () => clearTimeout(t);
    }, []);

    const materials: any[] = workOrder.materials ?? [];
    const parents = materials.filter((m: any) => !m.parent_product_id);
    const childrenOf = (m: any) =>
        materials.filter((c: any) => c.parent_product_id === m.product_id && (c.month ?? 1) === (m.month ?? 1));

    // Kelompokkan material utama per bulan.
    const groups = (() => {
        const map = new Map<number, any[]>();
        parents.forEach((m: any) => {
            const mo = Number(m.month) || 1;
            if (!map.has(mo)) map.set(mo, []);
            map.get(mo)!.push(m);
        });
        return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    })();

    const visitTypes: string[] = workOrder.visit_types ?? [];

    const premise = workOrder.sales_order?.premise ?? null;
    const refMonth = workOrder.sales_order_item?.month ?? null;

    // Tanggal visit plan SO yang jatuh pada bulan item SO yang direferensikan.
    const refVisitDates: any[] = (() => {
        const vps = (workOrder.sales_order?.visit_plans ?? []).filter((v: any) => v.visit_date);
        const start = workOrder.contract?.start_date;
        if (!start || !refMonth) return vps;
        const duration = Number(workOrder.contract?.duration_months) > 0 ? Number(workOrder.contract.duration_months) : 1;
        return vps.filter((v: any) => contractMonthOf(start, v.visit_date, duration) === Number(refMonth));
    })();

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white py-8 print:py-0">
            <Head title={`Work Order ${workOrder.wo_number}`} />

            <div className="max-w-3xl mx-auto mb-4 flex gap-3 print:hidden">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                    🖨 Print / Save as PDF
                </button>
                <Link href="/work-orders" className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50">
                    ← Back to List
                </Link>
            </div>

            <div className="max-w-3xl mx-auto bg-white shadow print:shadow-none p-10 print:p-0 text-gray-900">

                <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wide">{companyName || 'Company'}</h1>
                        <p className="text-sm text-gray-500 mt-1">Work Service Order Document</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold uppercase">Work Order</h2>
                        <p className="text-sm font-mono mt-1">{workOrder.wo_number}</p>
                        <p className="text-xs text-gray-500 mt-1">Status: {statusLabel[workOrder.status] ?? workOrder.status}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Customer</h3>
                        <p className="font-semibold text-gray-900">{workOrder.contract?.customer?.name ?? '—'}</p>
                        {workOrder.contract?.customer?.address && <p className="text-sm text-gray-600">{workOrder.contract.customer.address}</p>}
                        {workOrder.contract?.customer?.phone && <p className="text-sm text-gray-600">Phone: {workOrder.contract.customer.phone}</p>}
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">References</h3>
                        <Row label="Contract No." value={workOrder.contract?.contract_number} />
                        <Row label="Sales Order No." value={workOrder.sales_order?.so_number} />
                        {workOrder.sales_order_item && (
                            <Row label="SO Item Ref." value={`Bulan ${workOrder.sales_order_item.month} — ${workOrder.sales_order_item.product?.name ?? ''}`} />
                        )}
                        {premise && (
                            <>
                                <Row label="Premis Lokasi" value={premise.location} />
                                <Row label="Premis Alamat" value={premise.address} />
                                <Row label="Premis PIC" value={premise.pic} />
                            </>
                        )}
                    </div>
                </div>

                {workOrder.sales_order_item && (
                    <div className="mb-6">
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">
                            Visit Plan (SO {workOrder.sales_order?.so_number ?? ''}{refMonth ? ` — Bulan ${refMonth}` : ''})
                        </h3>
                        {refVisitDates.length === 0 ? (
                            <p className="text-sm text-gray-400">Tidak ada tanggal visit plan pada bulan ini.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {refVisitDates.map((v: any, i: number) => (
                                    <span key={i} className="inline-flex items-center rounded border border-gray-300 px-2 py-1 text-xs text-gray-700">
                                        Visit {v.visit_number}: {fmtDate(v.visit_date)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Service</h3>
                        <Row label="Service Area" value={workOrder.service_area} />
                        <Row label="Visit Date" value={fmtDate(workOrder.visit_date)} />
                        <Row label="Visit Type" value={visitTypes.length ? visitTypes.map(v => visitTypeLabel[v] ?? v).join(', ') : '—'} />
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Execution</h3>
                        <Row label="Technician" value={workOrder.technician?.name} />
                        <Row label="Time In" value={workOrder.time_in} />
                        <Row label="Time Out" value={workOrder.time_out} />
                    </div>
                </div>

                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Product / Material Used</h3>
                <table className="w-full text-sm border border-gray-300 mb-6">
                    <thead className="bg-gray-100">
                        <tr className="text-left">
                            <th className="border border-gray-300 px-2 py-1.5 w-16 text-center">Bulan</th>
                            <th className="border border-gray-300 px-2 py-1.5">Product</th>
                            <th className="border border-gray-300 px-2 py-1.5 w-16">Unit</th>
                            <th className="border border-gray-300 px-2 py-1.5 w-16 text-center">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parents.length === 0 && (
                            <tr><td colSpan={4} className="border border-gray-300 px-2 py-3 text-center text-gray-400">No material.</td></tr>
                        )}
                        {groups.map(([month, rows]) =>
                            rows.map((m: any, i: number) => {
                                const subs = childrenOf(m);
                                return (
                                    <Fragment key={`${month}-${i}`}>
                                        <tr>
                                            <td className="border border-gray-300 px-2 py-1.5 text-center">{i === 0 ? month : ''}</td>
                                            <td className="border border-gray-300 px-2 py-1.5">{m.product?.name ?? '—'}</td>
                                            <td className="border border-gray-300 px-2 py-1.5">{m.uom || m.product?.unit || '—'}</td>
                                            <td className="border border-gray-300 px-2 py-1.5 text-center">{m.quantity_used}</td>
                                        </tr>
                                        {subs.length > 0 && (
                                            <tr>
                                                <td className="border border-gray-300"></td>
                                                <td className="border border-gray-300 px-2 py-1.5" colSpan={3}>
                                                    <span className="text-xs font-semibold text-gray-500">Sub Product:</span>
                                                    <ul className="text-xs text-gray-700 mt-1 ml-3 list-disc">
                                                        {subs.map((sub: any, si: number) => (
                                                            <li key={si}>{sub.product?.name ?? '—'} — {sub.quantity_used} {sub.uom || sub.product?.unit || ''}</li>
                                                        ))}
                                                    </ul>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {workOrder.technician_notes && (
                    <div className="mb-8">
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">Technician Notes</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{workOrder.technician_notes}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-8 mt-16 text-sm">
                    <div className="text-center">
                        <p className="text-gray-500 mb-16">Technician</p>
                        <p className="border-t border-gray-400 pt-1">{workOrder.technician?.name ?? '(______________)'}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 mb-16">Customer</p>
                        <p className="border-t border-gray-400 pt-1">{workOrder.contract?.customer?.name ?? '(______________)'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

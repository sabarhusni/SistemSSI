import { Head, Link } from '@inertiajs/react';
import { Fragment, useEffect } from 'react';

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// Tanggal gaya DD/MM/YYYY dipakai pada Service Report Pest Control.
const fmtShort = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${dt.getFullYear()}`;
};

const statusLabel: Record<string, string> = {
    pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

const visitTypeLabel: Record<string, string> = {
    routine: 'Routine', complaint: 'Complaint', followup: 'Follow Up',
};

const purposeLabel: Record<string, string> = {
    routine: 'Routine (R)', complaint: 'Complaint (C)', followup: 'Follow Up (F)',
};

// Identitas perusahaan pada kop surat (sama dengan yang dipakai di cetak Contract).
const COMPANY = {
    name: 'CV. SINERGY SERVE INDONESIA',
    addressLines: ['Sekedengdeur No. 15, Ujungberung', 'Kota Bandung, Jawa Barat 40167'],
};

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

    // Pest Control pakai layout Service Report (Form H). Tipe service lain (mis. Scenting)
    // tetap memakai layout generik di bawah, tidak berubah.
    if (workOrder.contract?.service_type === 'pest_control') {
        return <PestControlServiceReport workOrder={workOrder} companyName={companyName} />;
    }

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

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white py-8 print:py-0">
            <Head title={`Service Report ${workOrder.wo_number}`} />

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
                        <h2 className="text-lg font-bold uppercase">Service Report</h2>
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
                        {(workOrder.month ?? workOrder.sales_order_item?.month) && (
                            <Row label="Referensi Bulan" value={`Bulan ${workOrder.month ?? workOrder.sales_order_item?.month}`} />
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
                        <p className="border-t border-gray-400 pt-1">{premise?.pic ?? '(______________)'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Kop surat dipakai berulang di tiap halaman Service Report Pest Control.
function PestHeader({ companyNameResolved, woNumber }: { companyNameResolved: string; woNumber: string }) {
    return (
        <div className="flex items-start justify-between border-b-2 border-amber-600 pb-3 mb-3">
            <div className="flex items-start gap-2">
                <img src="/images/logo_ssi_new.png" alt="" className="h-10 w-10 object-contain shrink-0" />
                <div>
                    <p className="text-[11px] font-bold uppercase">Service Report <span className="font-normal normal-case">(Record of Pesticides Usage)</span></p>
                    <p className="text-[10px] text-gray-500">Report to Customer</p>
                </div>
            </div>
            <div className="text-right">
                <h2 className="text-base font-extrabold text-amber-600">{companyNameResolved}</h2>
                <p className="text-[10px] text-gray-500">Reference No: {woNumber}</p>
            </div>
        </div>
    );
}

function PestFooter({ companyNameResolved }: { companyNameResolved: string }) {
    return (
        <p className="text-[9px] text-gray-400 mt-6 border-t pt-2">
            {companyNameResolved} — {COMPANY.addressLines.join(', ')}
        </p>
    );
}

// Baris "Label : Value" pada tabel Section A, konsisten dengan gaya InfoRow di cetak Contract.
function PestRow({ label, value }: { label: string; value: any }) {
    return (
        <tr>
            <td className="border border-gray-400 px-2 py-1 w-44 align-top text-gray-600">{label}</td>
            <td className="border border-gray-400 px-1 py-1 w-3 align-top text-center">:</td>
            <td className="border border-gray-400 px-2 py-1 align-top font-medium">{value || ' '}</td>
        </tr>
    );
}

// Layout Service Report (Form H) khusus kontrak Pest Control. Kolom yang datanya belum
// dicatat sistem (Active Ingredient, Class, Conc. %, Total Area Treated, Licence No,
// Vehicle No, Site Risk Assessment, Pest Status, Recommendations) dicetak kosong untuk
// diisi manual — tidak ada penambahan skema database untuk atribut tersebut.
function PestControlServiceReport({ workOrder, companyName }: any) {
    const premise = workOrder.sales_order?.premise ?? null;
    const customer = workOrder.contract?.customer ?? {};
    // Baris tanpa parent_product_id = produk jasa (Referensi Bulan); dengan parent_product_id = consumable/pestisida.
    const materials: any[] = workOrder.materials ?? [];
    const serviceMaterials = materials.filter((m: any) => !m.parent_product_id);
    const consumableMaterials = materials.filter((m: any) => m.parent_product_id);
    const visitTypes: string[] = workOrder.visit_types ?? [];
    const purpose = visitTypes.length ? visitTypes.map(v => purposeLabel[v] ?? v).join(', ') : '—';
    const companyNameResolved = companyName || COMPANY.name;
    const customerName = premise?.location || customer.company_name || customer.name;

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white py-8 print:py-0 text-[11px] leading-snug text-gray-900">
            <Head title={`Service Report ${workOrder.wo_number}`} />
            <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>

            <div className="max-w-[800px] mx-auto mb-4 flex gap-3 print:hidden">
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

            {/* ===================== HALAMAN 1 ===================== */}
            <div className="max-w-[800px] mx-auto bg-white shadow print:shadow-none px-10 py-8 print:p-0">
                <PestHeader companyNameResolved={companyNameResolved} woNumber={workOrder.wo_number} />

                <h3 className="font-bold border-b border-gray-800 mb-1">A. CUSTOMER INFORMATION</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <table className="w-full border-collapse h-fit">
                        <tbody>
                            <PestRow label="Purpose of Treatment" value={purpose} />
                            <PestRow label="Contract / Job No." value={workOrder.contract?.contract_number} />
                            <PestRow label="Service Area" value={workOrder.service_area} />
                            <PestRow label="Type of Premises" value={null} />
                            <PestRow label="Customer Name" value={customerName} />
                            <PestRow label="Contact Name" value={premise?.pic} />
                            <PestRow label="Contact Number" value={premise?.phone} />
                            <PestRow label="Address Site Of Application" value={premise?.address} />
                        </tbody>
                    </table>
                    <div>
                        <table className="w-full border-collapse mb-2">
                            <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="border border-gray-400 px-2 py-1">Type of Pests Covered</th>
                                    <th className="border border-gray-400 px-2 py-1 w-12 text-center">Qty</th>
                                    <th className="border border-gray-400 px-2 py-1 w-12 text-center">Freq</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviceMaterials.length === 0 && (
                                    <tr><td colSpan={3} className="border border-gray-400 px-2 py-2 text-center text-gray-400">—</td></tr>
                                )}
                                {serviceMaterials.map((m: any, i: number) => (
                                    <tr key={i}>
                                        <td className="border border-gray-400 px-2 py-1">{m.product?.name || '—'}</td>
                                        <td className="border border-gray-400 px-2 py-1 text-center">{m.quantity_used ?? '—'}</td>
                                        <td className="border border-gray-400 px-2 py-1 text-center">—</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="border border-gray-400 px-2 py-1">
                            <span className="text-gray-500">Site Risk Assessments:</span>
                            <div className="h-9" />
                        </div>
                    </div>
                </div>

                <h3 className="font-bold border-b border-gray-800 mb-1">B. PESTICIDES APPLIED</h3>
                <table className="w-full border-collapse text-center mb-2">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-400 px-2 py-1">Active Ingredient</th>
                            <th className="border border-gray-400 px-2 py-1">Trade Name</th>
                            <th className="border border-gray-400 px-2 py-1 w-14">Class</th>
                            <th className="border border-gray-400 px-2 py-1 w-20">Conc. Diluted Sol'n Applied %</th>
                            <th className="border border-gray-400 px-2 py-1 w-24">Method of Application</th>
                            <th className="border border-gray-400 px-2 py-1 w-20">Total Area Treated</th>
                            <th className="border border-gray-400 px-2 py-1 w-24">Total Qty Diluted Sol'n used</th>
                        </tr>
                    </thead>
                    <tbody>
                        {consumableMaterials.length === 0 && (
                            <tr><td colSpan={7} className="border border-gray-400 px-2 py-3 text-gray-400">No material.</td></tr>
                        )}
                        {consumableMaterials.map((m: any, i: number) => (
                            <tr key={i}>
                                <td className="border border-gray-400 px-2 py-1 text-left">{m.product?.description || '—'}</td>
                                <td className="border border-gray-400 px-2 py-1 text-left">{m.product?.name ?? '—'}</td>
                                <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                                <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                                <td className="border border-gray-400 px-2 py-1">{m.method_of_application || '—'}</td>
                                <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                                <td className="border border-gray-400 px-2 py-1">{m.quantity_used} {m.uom || m.product?.unit || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h3 className="font-bold border-b border-gray-800 mb-1">C. PEST STATUS</h3>
                <table className="w-full border-collapse mb-3">
                    <thead>
                        <tr className="bg-gray-100 text-left">
                            <th className="border border-gray-400 px-2 py-1 w-28">Pest</th>
                            <th className="border border-gray-400 px-2 py-1 w-20">Level</th>
                            <th className="border border-gray-400 px-2 py-1 w-32">Location Found</th>
                            <th className="border border-gray-400 px-2 py-1">Remark</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[0, 1, 2].map(i => (
                            <tr key={i}>
                                <td className="border border-gray-400 px-2 py-2">&nbsp;</td>
                                <td className="border border-gray-400 px-2 py-2">&nbsp;</td>
                                <td className="border border-gray-400 px-2 py-2">&nbsp;</td>
                                <td className="border border-gray-400 px-2 py-2">&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h3 className="font-bold border-b border-gray-800 mb-1">D. TECHNICIAN NOTES / RECOMMENDATION</h3>
                <div className="border border-gray-400 px-2 py-2 mb-3 min-h-[3rem] whitespace-pre-line">
                    {workOrder.technician_notes || <span className="text-gray-400">&nbsp;</span>}
                </div>

                <PestFooter companyNameResolved={companyNameResolved} />
            </div>

            {/* ===================== HALAMAN 2 ===================== */}
            <div className="max-w-[800px] mx-auto bg-white shadow print:shadow-none px-10 py-8 print:p-0 mt-8 print:mt-0 break-before-page">
                <PestHeader companyNameResolved={companyNameResolved} woNumber={workOrder.wo_number} />

                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <h3 className="font-bold border-b border-gray-800 mb-1">F. APPLICATOR'S INFORMATION</h3>
                        <p className="mb-2">I declare the information above is true and correct:</p>
                        <p className="mb-1">Signature:</p>
                        <div className="h-14 border-b border-gray-400 mb-2" />
                        <p>Applicators Name: {workOrder.technician?.name || '—'}</p>
                        <div className="flex justify-between mt-1">
                            <span>Licence No: </span>
                            <span>Time in: {workOrder.time_in || '—'}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span>Treatment Date: {fmtShort(workOrder.visit_date)}</span>
                            <span>Time out: {workOrder.time_out || '—'}</span>
                        </div>
                        <p className="mt-2">Name of other Applicator(s):</p>
                        <div className="h-6 border-b border-gray-400 mb-2" />
                        <p>Vehicle No:</p>
                    </div>
                    <div>
                        <h3 className="font-bold border-b border-gray-800 mb-1">G. CUSTOMER'S SIGNATURE / CHOP</h3>
                        <p className="mb-2">I acknowledge receipt of the above report:</p>
                        <p className="mb-1">Signature:</p>
                        <div className="h-14 border-b border-gray-400 mb-2" />
                        <p>Chop:</p>
                        <div className="h-10 border-b border-gray-400 mb-2" />
                        <p>Name of Customer: {premise?.pic || '—'}</p>
                        <p>Date:</p>
                    </div>
                </div>

                <PestFooter companyNameResolved={companyNameResolved} />
            </div>
        </div>
    );
}

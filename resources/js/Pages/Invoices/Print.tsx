import { Head, Link } from '@inertiajs/react';
import { Fragment, useEffect, useMemo } from 'react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const statusLabel: Record<string, string> = {
    draft: 'Draft', sent: 'Sent', paid: 'Paid', cancelled: 'Cancelled',
};

function Row({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex text-sm py-1">
            <span className="w-32 shrink-0 text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium">: {value ?? '—'}</span>
        </div>
    );
}

export default function Print({ invoice, companyName }: any) {
    useEffect(() => {
        const t = setTimeout(() => window.print(), 400);
        return () => clearTimeout(t);
    }, []);

    const items: any[] = invoice.items ?? [];
    const woRefs = (invoice.work_orders ?? []).map((w: any) => w.wo_number).join(', ');

    // Kontrak pest hama unik ditagih sebagai 1 baris nilai lump-sum — kolom Visit ke
    // & Unit tidak relevan (tidak terikat visit/bulan atau satuan produk tertentu).
    const isUniquePest = invoice.contract?.service_type === 'pest_control' && !!invoice.contract?.is_unique_pest;
    const colCount = isUniquePest ? 5 : 7;

    // Grouping tampilan item per premis (Lokasi + Alamat) — header ditampilkan sekali
    // per grup, baris item di bawahnya tidak mengulang kolom Lokasi/Alamat.
    const premiseGroups = useMemo(() => {
        const map = new Map<string, { location: string; address: string; rows: any[] }>();
        items.forEach((it: any) => {
            const key = `${it.premise_location || ''}|${it.premise_address || ''}`;
            if (!map.has(key)) map.set(key, { location: it.premise_location, address: it.premise_address, rows: [] });
            map.get(key)!.rows.push(it);
        });
        return Array.from(map.values());
    }, [items]);

    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.subtotal) || Number(it.quantity) * Number(it.unit_price) || 0), 0);
    const taxAmount = items.reduce((s: number, it: any) => s + (Number(it.tax_amount) || 0), 0);
    const total = Number(invoice.total_amount) || subtotal + taxAmount;
    const paid = Number(invoice.paid_amount) || 0;
    const balance = total - paid;

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white py-8 print:py-0">
            <Head title={`Invoice ${invoice.invoice_number}`} />

            <div className="max-w-3xl mx-auto mb-4 flex gap-3 print:hidden">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                    🖨 Print / Save as PDF
                </button>
                <Link href="/invoices" className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50">
                    ← Back to List
                </Link>
            </div>

            <div className="max-w-3xl mx-auto bg-white shadow print:shadow-none p-10 print:p-0 text-gray-900">

                <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
                    <div className="flex items-start gap-3">
                        <img src="/images/logo_ssi_new.png" alt="" className="h-12 w-12 object-contain shrink-0" />
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wide">{companyName || 'Company'}</h1>
                            <p className="text-sm text-gray-500 mt-1">Tax Invoice Document</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold uppercase">Invoice</h2>
                        <p className="text-sm font-mono mt-1">{invoice.invoice_number}</p>
                        <p className="text-xs text-gray-500 mt-1">Status: {statusLabel[invoice.status] ?? invoice.status}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Bill To</h3>
                        <p className="font-semibold text-gray-900">{invoice.customer?.name ?? '—'}</p>
                        {invoice.customer?.address && <p className="text-sm text-gray-600">{invoice.customer.address}</p>}
                        {invoice.customer?.phone && <p className="text-sm text-gray-600">Phone: {invoice.customer.phone}</p>}
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Details</h3>
                        <Row label="Invoice Date" value={fmtDate(invoice.invoice_date)} />
                        <Row label="Due Date" value={fmtDate(invoice.due_date)} />
                        <Row label="Contract No." value={invoice.contract?.contract_number} />
                        <Row label="Referensi No WO" value={woRefs || '—'} />
                    </div>
                </div>

                <table className="w-full text-sm border border-gray-300 mb-6">
                    <thead className="bg-gray-100">
                        <tr className="text-left">
                            <th className="border border-gray-300 px-2 py-1.5 w-8 text-center">#</th>
                            <th className="border border-gray-300 px-2 py-1.5">Description</th>
                            {!isUniquePest && <th className="border border-gray-300 px-2 py-1.5 w-20 text-center">Visit ke</th>}
                            <th className="border border-gray-300 px-2 py-1.5 w-16 text-center">Qty</th>
                            {!isUniquePest && <th className="border border-gray-300 px-2 py-1.5 w-16">Unit</th>}
                            <th className="border border-gray-300 px-2 py-1.5 w-32 text-right">Unit Price</th>
                            <th className="border border-gray-300 px-2 py-1.5 w-32 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr><td colSpan={colCount} className="border border-gray-300 px-2 py-3 text-center text-gray-400">No items.</td></tr>
                        )}
                        {(() => {
                            let counter = 0;
                            return premiseGroups.map((group, gi) => (
                                <Fragment key={gi}>
                                    <tr>
                                        <td colSpan={colCount} className="border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs font-semibold">
                                            {group.location || '—'}{group.address ? ` — ${group.address}` : ''}
                                        </td>
                                    </tr>
                                    {group.rows.map((it: any) => {
                                        counter++;
                                        return (
                                            <tr key={counter}>
                                                <td className="border border-gray-300 px-2 py-1.5 text-center">{counter}</td>
                                                <td className="border border-gray-300 px-2 py-1.5">{it.product?.name ?? it.description ?? '—'}</td>
                                                {!isUniquePest && <td className="border border-gray-300 px-2 py-1.5 text-center">Visit ke-{it.month ?? 1}</td>}
                                                <td className="border border-gray-300 px-2 py-1.5 text-center">{it.quantity}</td>
                                                {!isUniquePest && <td className="border border-gray-300 px-2 py-1.5">{it.uom || it.product?.unit || '—'}</td>}
                                                <td className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">{fmt(it.unit_price)}</td>
                                                <td className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">{fmt(it.subtotal || Number(it.quantity) * Number(it.unit_price))}</td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            ));
                        })()}
                    </tbody>
                </table>

                <div className="flex justify-end mb-8">
                    <div className="w-72 text-sm">
                        <div className="flex justify-between py-1 font-semibold">
                            <span className="text-gray-700">Total</span>
                            <span className="text-emerald-700">{fmt(total)}</span>
                        </div>
                        {paid > 0 && (
                            <>
                                <div className="flex justify-between py-1">
                                    <span className="text-gray-600">Paid</span>
                                    <span className="text-gray-900">{fmt(paid)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-t border-gray-300 font-semibold">
                                    <span className="text-gray-700">Balance Due</span>
                                    <span className="text-red-600">{fmt(balance)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {invoice.notes && (
                    <div className="mb-8">
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-1">Notes</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-8 mt-16 text-sm">
                    <div className="text-center">
                        <p className="text-gray-500 mb-16">Customer</p>
                        <p className="border-t border-gray-400 pt-1">{invoice.customer?.name ?? '(______________)'}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 mb-16">{companyName || 'Company'}</p>
                        <p className="border-t border-gray-400 pt-1">(______________)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

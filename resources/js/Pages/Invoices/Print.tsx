import { Head, Link } from '@inertiajs/react';
import { useEffect } from 'react';

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
    const premise = invoice.sales_order?.premise ?? null;

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
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wide">{companyName || 'Company'}</h1>
                        <p className="text-sm text-gray-500 mt-1">Tax Invoice Document</p>
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
                        {premise && (
                            <p className="text-sm text-gray-600 mt-2">
                                Lokasi: {premise.location ?? '—'}{premise.pic ? ` (PIC: ${premise.pic})` : ''}
                            </p>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">Details</h3>
                        <Row label="Invoice Date" value={fmtDate(invoice.invoice_date)} />
                        <Row label="Due Date" value={fmtDate(invoice.due_date)} />
                        <Row label="Contract No." value={invoice.contract?.contract_number} />
                    </div>
                </div>

                <table className="w-full text-sm border border-gray-300 mb-6">
                    <thead className="bg-gray-100">
                        <tr className="text-left">
                            <th className="border border-gray-300 px-2 py-1.5 w-8 text-center">#</th>
                            <th className="border border-gray-300 px-2 py-1.5">Description</th>
                            <th className="border border-gray-300 px-2 py-1.5 w-14 text-center">Bulan</th>
                            <th className="border border-gray-300 px-2 py-1.5 w-16 text-center">Qty</th>
                            <th className="border border-gray-300 px-2 py-1.5 w-16">Unit</th>
                            <th className="border border-gray-300 px-2 py-1.5 w-32 text-right">Unit Price</th>
                            <th className="border border-gray-300 px-2 py-1.5 w-32 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr><td colSpan={7} className="border border-gray-300 px-2 py-3 text-center text-gray-400">No items.</td></tr>
                        )}
                        {items.map((it: any, i: number) => (
                            <tr key={i}>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{i + 1}</td>
                                <td className="border border-gray-300 px-2 py-1.5">{it.product?.name ?? it.description ?? '—'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{it.month ?? 1}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-center">{it.quantity}</td>
                                <td className="border border-gray-300 px-2 py-1.5">{it.uom || it.product?.unit || '—'}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">{fmt(it.unit_price)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">{fmt(it.subtotal || Number(it.quantity) * Number(it.unit_price))}</td>
                            </tr>
                        ))}
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
                        <p className="border-t border-gray-400 pt-1">{premise?.pic ?? invoice.customer?.name ?? '(______________)'}</p>
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

import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtNum, fmtDate, fmtMonth, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, statusBadge, applyFilters, exportToExcel } from './_shared';

const methodLabel = (m: string) => m ? m.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';

export default function Invoices({ invoices, byMonth, summary, customers, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const year = today.slice(0, 4);

    const [f, setF] = useState({
        from: filters?.from ?? `${year}-01-01`,
        to: filters?.to ?? `${year}-12-31`,
        customer_id: filters?.customer_id ?? '',
        status: filters?.status ?? '',
        payment_method: filters?.payment_method ?? '',
    });

    const handleExport = () => exportToExcel('Laporan_Invoices', [
        {
            name: 'Invoices',
            headers: ['Tanggal', 'No. Invoice', 'Customer', 'Kontrak', 'Status', 'Metode Pembayaran', 'Total Invoice', 'Nilai Paid'],
            rows: (invoices ?? []).map((inv: any) => [
                inv.invoice_date, inv.invoice_number, inv.customer ?? '-', inv.contract_number ?? '-', inv.status,
                (inv.payment_methods ?? []).map(methodLabel).join(', ') || '-',
                Number(inv.total_amount ?? 0), Number(inv.paid_amount ?? 0),
            ]),
        },
        {
            name: 'Rekap Bulanan',
            headers: ['Bulan', 'Jml Invoice', 'Total Invoice', 'Nilai Paid'],
            rows: (byMonth ?? []).map((m: any) => [m.month, m.count, Number(m.total_amount ?? 0), Number(m.paid_amount ?? 0)]),
        },
    ]);

    return (
        <AppLayout header="Laporan Invoices">
            <Head title="Laporan Invoices" />
            <FilterBar onApply={() => applyFilters('/reports/invoices', f)} onExport={handleExport}>
                <FilterDate label="Dari" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="Sampai" value={f.to} onChange={v => setF({ ...f, to: v })} />
                <FilterSelect label="Customer" value={f.customer_id} onChange={v => setF({ ...f, customer_id: v })}>
                    <option value="">Semua Customer</option>
                    {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FilterSelect>
                <FilterSelect label="Status" value={f.status} onChange={v => setF({ ...f, status: v })}>
                    <option value="">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                </FilterSelect>
                <FilterSelect label="Metode Pembayaran" value={f.payment_method} onChange={v => setF({ ...f, payment_method: v })}>
                    <option value="">Semua Metode</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="giro">Giro</option>
                </FilterSelect>
            </FilterBar>

            <div className="grid grid-cols-4 gap-4 mb-4">
                <SummaryCard label="Jml Invoice" value={fmtNum(summary?.total_invoices)} color="gray" />
                <SummaryCard label="Total Invoice" value={fmt(summary?.total_amount)} color="blue" />
                <SummaryCard label="Total Terbayar" value={fmt(summary?.total_paid)} color="emerald" />
                <SummaryCard label="Outstanding" value={fmt(summary?.total_outstanding)} color="amber" />
            </div>

            {byMonth?.length > 0 && (
                <div className="bg-white rounded-xl shadow px-5 py-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Rekap Invoice per Bulan</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 border-b">
                                <tr className="text-left">
                                    <th className="py-1.5 pr-4">Bulan</th>
                                    <th className="py-1.5 pr-4 text-center">Jml Invoice</th>
                                    <th className="py-1.5 pr-4 text-right">Total Invoice</th>
                                    <th className="py-1.5 text-right">Nilai Paid</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {byMonth.map((m: any) => (
                                    <tr key={m.month}>
                                        <td className="py-1.5 pr-4 font-medium">{fmtMonth(m.month)}</td>
                                        <td className="py-1.5 pr-4 text-center">{fmtNum(m.count)}</td>
                                        <td className="py-1.5 pr-4 text-right">{fmt(m.total_amount)}</td>
                                        <td className="py-1.5 text-right text-emerald-700">{fmt(m.paid_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ReportTable
                headers={['Tanggal', 'No. Invoice', 'Customer', 'Kontrak', 'Status', 'Metode Pembayaran', 'Total Invoice', 'Nilai Paid']}
                empty={!invoices?.length}
            >
                {invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                        <td className="px-4 py-2 font-medium">
                            <Link href={`/invoices/${inv.id}/edit`} className="text-blue-600 hover:underline">{inv.invoice_number}</Link>
                        </td>
                        <td className="px-4 py-2">{inv.customer ?? '—'}</td>
                        <td className="px-4 py-2">{inv.contract_number ?? '—'}</td>
                        <td className="px-4 py-2">{statusBadge(inv.status)}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{(inv.payment_methods ?? []).map(methodLabel).join(', ') || '—'}</td>
                        <td className="px-4 py-2 text-right">{fmt(inv.total_amount)}</td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-700">{fmt(inv.paid_amount)}</td>
                    </tr>
                ))}
                {invoices?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={6} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right">{fmt(summary?.total_amount)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(summary?.total_paid)}</td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

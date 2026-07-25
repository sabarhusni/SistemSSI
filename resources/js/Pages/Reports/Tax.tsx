import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtNum, fmtDate, fmtMonth, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, statusBadge, applyFilters, exportToExcel } from './_shared';

export default function Tax({ invoices, byMonth, summary, customers, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const year = today.slice(0, 4);

    const [f, setF] = useState({
        from: filters?.from ?? `${year}-01-01`,
        to: filters?.to ?? `${year}-12-31`,
        customer_id: filters?.customer_id ?? '',
        status: filters?.status ?? '',
    });

    const handleExport = () => exportToExcel('Laporan_Pajak', [
        {
            name: 'Faktur',
            headers: ['Tanggal', 'No. Faktur', 'Customer', 'DPP', 'Tarif (%)', 'PPN', 'Total', 'Status'],
            rows: (invoices ?? []).map((inv: any) => [
                inv.invoice_date, inv.invoice_number, inv.customer ?? '-', Number(inv.dpp ?? 0),
                Number(inv.tax_rate ?? 0), Number(inv.tax ?? 0), Number(inv.total ?? 0), inv.status,
            ]),
        },
        {
            name: 'Rekap Bulanan',
            headers: ['Bulan', 'Jml Faktur', 'DPP', 'PPN', 'Total'],
            rows: (byMonth ?? []).map((m: any) => [
                m.month, m.count, Number(m.dpp ?? 0), Number(m.tax ?? 0), Number(m.total ?? 0),
            ]),
        },
    ]);

    return (
        <AppLayout header="Laporan Pajak (PPN)">
            <Head title="Laporan Pajak" />
            <FilterBar onApply={() => applyFilters('/reports/tax', f)} onExport={handleExport}>
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
                </FilterSelect>
            </FilterBar>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <SummaryCard label="Total Faktur" value={fmtNum(summary?.total_invoices)} color="gray" />
                <SummaryCard label="Total DPP" value={fmt(summary?.total_dpp)} color="blue" />
                <SummaryCard label="Total PPN" value={fmt(summary?.total_tax)} color="amber" />
                <SummaryCard label="Total (DPP + PPN)" value={fmt(summary?.total)} color="emerald" />
            </div>

            {byMonth?.length > 0 && (
                <div className="bg-white rounded-xl shadow px-5 py-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Rekap PPN per Bulan</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 border-b">
                                <tr className="text-left">
                                    <th className="py-1.5 pr-4">Bulan</th>
                                    <th className="py-1.5 pr-4 text-center">Faktur</th>
                                    <th className="py-1.5 pr-4 text-right">DPP</th>
                                    <th className="py-1.5 pr-4 text-right">PPN</th>
                                    <th className="py-1.5 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {byMonth.map((m: any) => (
                                    <tr key={m.month}>
                                        <td className="py-1.5 pr-4 font-medium">{fmtMonth(m.month)}</td>
                                        <td className="py-1.5 pr-4 text-center">{fmtNum(m.count)}</td>
                                        <td className="py-1.5 pr-4 text-right">{fmt(m.dpp)}</td>
                                        <td className="py-1.5 pr-4 text-right text-amber-700">{fmt(m.tax)}</td>
                                        <td className="py-1.5 text-right">{fmt(m.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ReportTable
                headers={['Tanggal', 'No. Faktur', 'Customer', 'DPP', 'Tarif', 'PPN', 'Total', 'Status']}
                empty={!invoices?.length}
            >
                {invoices?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                        <td className="px-4 py-2 font-medium">
                            <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">{inv.invoice_number}</Link>
                        </td>
                        <td className="px-4 py-2">{inv.customer ?? '—'}</td>
                        <td className="px-4 py-2 text-right">{fmt(inv.dpp)}</td>
                        <td className="px-4 py-2 text-center text-xs">{fmtNum(inv.tax_rate)}%</td>
                        <td className="px-4 py-2 text-right text-amber-700 font-medium">{fmt(inv.tax)}</td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(inv.total)}</td>
                        <td className="px-4 py-2">{statusBadge(inv.status)}</td>
                    </tr>
                ))}
                {invoices?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-blue-700">{fmt(summary?.total_dpp)}</td>
                        <td></td>
                        <td className="px-4 py-2 text-right text-amber-700">{fmt(summary?.total_tax)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(summary?.total)}</td>
                        <td></td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

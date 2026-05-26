import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtMonth, SummaryCard, FilterBar, FilterDate, ReportTable, applyFilters } from './_shared';

export default function CashFlow({ rows, summary, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const sixMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString().slice(0, 8) + '01';

    const [f, setF] = useState({ from: filters?.from ?? sixMonthsAgo, to: filters?.to ?? today });

    const netColor = (n: number) => n >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold';

    return (
        <AppLayout header="Laporan Cash Flow">
            <Head title="Cash Flow" />
            <FilterBar onApply={() => applyFilters('/reports/cash-flow', f)}>
                <FilterDate label="Dari" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="Sampai" value={f.to} onChange={v => setF({ ...f, to: v })} />
            </FilterBar>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <SummaryCard label="Total Pemasukan" value={fmt(summary?.total_in)} color="emerald" />
                <SummaryCard label="Total Pengeluaran" value={fmt(summary?.total_out)} color="red" />
                <SummaryCard label="Net Cash Flow" value={fmt(summary?.net)} color={summary?.net >= 0 ? 'emerald' : 'red'} sub={summary?.net >= 0 ? 'Surplus' : 'Defisit'} />
            </div>

            <ReportTable
                headers={['Periode', 'Kas Masuk', 'Bank Masuk', 'Total Masuk', 'Kas Keluar', 'Bank Keluar', 'Total Keluar', 'Net']}
                empty={!rows?.length}
            >
                {rows?.map((r: any, i: number) => {
                    const totalIn  = (r.cash_in ?? 0) + (r.bank_in ?? 0);
                    const totalOut = (r.cash_out ?? 0) + (r.bank_out ?? 0);
                    return (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{fmtMonth(r.month)}</td>
                            <td className="px-4 py-2 text-right text-emerald-700">{fmt(r.cash_in)}</td>
                            <td className="px-4 py-2 text-right text-emerald-700">{fmt(r.bank_in)}</td>
                            <td className="px-4 py-2 text-right font-semibold text-emerald-800">{fmt(totalIn)}</td>
                            <td className="px-4 py-2 text-right text-red-600">{fmt(r.cash_out)}</td>
                            <td className="px-4 py-2 text-right text-red-600">{fmt(r.bank_out)}</td>
                            <td className="px-4 py-2 text-right font-semibold text-red-700">{fmt(totalOut)}</td>
                            <td className={`px-4 py-2 text-right ${netColor(r.net)}`}>{fmt(r.net)}</td>
                        </tr>
                    );
                })}
                {rows?.length > 0 && (
                    <tr className="bg-gray-50 font-bold border-t">
                        <td className="px-4 py-2">Total</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(rows?.reduce((s: number, r: any) => s + (r.cash_in ?? 0), 0))}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(rows?.reduce((s: number, r: any) => s + (r.bank_in ?? 0), 0))}</td>
                        <td className="px-4 py-2 text-right text-emerald-800">{fmt(summary?.total_in)}</td>
                        <td className="px-4 py-2 text-right text-red-600">{fmt(rows?.reduce((s: number, r: any) => s + (r.cash_out ?? 0), 0))}</td>
                        <td className="px-4 py-2 text-right text-red-600">{fmt(rows?.reduce((s: number, r: any) => s + (r.bank_out ?? 0), 0))}</td>
                        <td className="px-4 py-2 text-right text-red-700">{fmt(summary?.total_out)}</td>
                        <td className={`px-4 py-2 text-right ${netColor(summary?.net ?? 0)}`}>{fmt(summary?.net)}</td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

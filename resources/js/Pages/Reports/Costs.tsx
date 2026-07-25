import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtDate, SummaryCard, FilterBar, FilterDate, ReportTable, applyFilters, exportToExcel } from './_shared';

export default function Costs({ rows, byCategory, summary, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = today.slice(0, 8) + '01';

    const [f, setF] = useState({ from: filters?.from ?? firstDay, to: filters?.to ?? today });

    const handleExport = () => exportToExcel('Costs_Report', [{
        name: 'Costs',
        headers: ['Date', 'Category', 'Source', 'Description', 'Amount'],
        rows: (rows ?? []).map((r: any) => [
            r.date, r.category, r.source, r.description ?? '-', Number(r.amount ?? 0),
        ]),
    }]);

    const categoryColors: Record<string, string> = {
        'Pembelian Barang': 'bg-blue-100 text-blue-700',
        'Material WO':      'bg-amber-100 text-amber-700',
        'Operasional':      'bg-gray-100 text-gray-600',
    };

    return (
        <AppLayout header="Costs Report">
            <Head title="Costs Report" />
            <FilterBar onApply={() => applyFilters('/reports/costs', f)} onExport={handleExport}>
                <FilterDate label="From" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="To" value={f.to} onChange={v => setF({ ...f, to: v })} />
            </FilterBar>

            {byCategory && Object.keys(byCategory).length > 0 && (
                <div className="bg-white rounded-xl shadow px-5 py-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Summary by Category</p>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(byCategory as Record<string, number>).map(([cat, total]) => (
                            <div key={cat} className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[cat] ?? 'bg-gray-100 text-gray-600'}`}>{cat}</span>
                                <span className="font-semibold text-sm">{fmt(total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-4">
                <SummaryCard label="Total Costs" value={fmt(summary?.total)} color="red" />
            </div>

            <ReportTable
                headers={['Date', 'Category', 'Source', 'Description', 'Amount']}
                empty={!rows?.length}
            >
                {rows?.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[r.category] ?? 'bg-gray-100 text-gray-600'}`}>
                                {r.category}
                            </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">{r.source}</td>
                        <td className="px-4 py-2">{r.description}</td>
                        <td className="px-4 py-2 text-right font-medium text-red-600">{fmt(r.amount)}</td>
                    </tr>
                ))}
                {rows?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={4} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-red-700">{fmt(summary?.total)}</td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

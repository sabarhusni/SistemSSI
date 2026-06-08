import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtDate, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, applyFilters } from './_shared';

export default function Insentif({ byPerson, summary, users, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = today.slice(0, 8) + '01';

    const [f, setF] = useState({
        from:    filters?.from    ?? firstDay,
        to:      filters?.to      ?? today,
        user_id: filters?.user_id ?? '',
        rate:    filters?.rate    ?? '5',
    });

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <AppLayout header="Sales Incentive Report">
            <Head title="Incentive Report" />
            <FilterBar onApply={() => applyFilters('/reports/insentif', f)}>
                <FilterDate label="From" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="To" value={f.to} onChange={v => setF({ ...f, to: v })} />
                <FilterSelect label="Sales Person" value={f.user_id} onChange={v => setF({ ...f, user_id: v })}>
                    <option value="">All Sales</option>
                    {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </FilterSelect>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Incentive Rate (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-28"
                        value={f.rate}
                        onChange={e => setF({ ...f, rate: e.target.value })}
                    />
                </div>
            </FilterBar>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <SummaryCard label="Total Sales" value={fmt(summary?.total_sales)} color="blue" />
                <SummaryCard label="Incentive Rate" value={`${summary?.rate ?? 0}%`} color="gray" />
                <SummaryCard label="Total Incentive" value={fmt(summary?.total_insentif)} color="emerald" />
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden mb-4">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600 text-xs">
                            <th className="px-4 py-2.5">Sales Person</th>
                            <th className="px-4 py-2.5 text-right">SO Count</th>
                            <th className="px-4 py-2.5 text-right">Total Sales</th>
                            <th className="px-4 py-2.5 text-right text-emerald-700">Incentive ({summary?.rate ?? 0}%)</th>
                            <th className="px-4 py-2.5 text-center">Detail</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {(!byPerson || byPerson.length === 0) && (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No data in this period.</td></tr>
                        )}
                        {byPerson?.map((p: any) => (
                            <>
                                <tr key={p.person_id ?? p.person_name} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-semibold text-gray-800">{p.person_name}</td>
                                    <td className="px-4 py-2 text-right text-gray-600">{p.order_count}</td>
                                    <td className="px-4 py-2 text-right font-medium">{fmt(p.total_sales)}</td>
                                    <td className="px-4 py-2 text-right font-bold text-emerald-700">{fmt(p.insentif)}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => toggleExpand(p.person_id ?? p.person_name)}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            {expanded[p.person_id ?? p.person_name] ? 'Hide' : 'View SOs'}
                                        </button>
                                    </td>
                                </tr>
                                {expanded[p.person_id ?? p.person_name] && p.orders?.map((o: any, i: number) => (
                                    <tr key={i} className="bg-blue-50 text-xs">
                                        <td className="px-8 py-1.5 text-gray-500">{o.so_number}</td>
                                        <td className="px-4 py-1.5 text-gray-500 text-right">{fmtDate(o.order_date)}</td>
                                        <td className="px-4 py-1.5 text-gray-600 text-right" colSpan={1}>{o.customer}</td>
                                        <td className="px-4 py-1.5 text-right font-medium">{fmt(o.amount)}</td>
                                        <td className="px-4 py-1.5 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                o.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>{o.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </>
                        ))}
                        {byPerson?.length > 0 && (
                            <tr className="bg-gray-50 font-bold border-t">
                                <td className="px-4 py-2">Total</td>
                                <td className="px-4 py-2 text-right">{byPerson.reduce((s: number, p: any) => s + p.order_count, 0)}</td>
                                <td className="px-4 py-2 text-right">{fmt(summary?.total_sales)}</td>
                                <td className="px-4 py-2 text-right text-emerald-700">{fmt(summary?.total_insentif)}</td>
                                <td></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}

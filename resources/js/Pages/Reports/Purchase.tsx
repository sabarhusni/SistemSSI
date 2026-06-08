import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtDate, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, statusBadge, applyFilters } from './_shared';

export default function Purchase({ orders, summary, suppliers, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = today.slice(0, 8) + '01';

    const [f, setF] = useState({ from: filters?.from ?? firstDay, to: filters?.to ?? today, supplier_id: filters?.supplier_id ?? '', status: filters?.status ?? '' });

    return (
        <AppLayout header="Purchase Report">
            <Head title="Purchase Report" />
            <FilterBar onApply={() => applyFilters('/reports/purchase', f)}>
                <FilterDate label="From" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="To" value={f.to} onChange={v => setF({ ...f, to: v })} />
                <FilterSelect label="Supplier" value={f.supplier_id} onChange={v => setF({ ...f, supplier_id: v })}>
                    <option value="">All Suppliers</option>
                    {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </FilterSelect>
                <FilterSelect label="Status" value={f.status} onChange={v => setF({ ...f, status: v })}>
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                </FilterSelect>
            </FilterBar>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <SummaryCard label="Total PO" value={summary?.total_orders?.toString() ?? '0'} color="gray" />
                <SummaryCard label="Total Purchases" value={fmt(summary?.total_amount)} color="blue" />
                <SummaryCard label="Average per PO" value={summary?.total_orders ? fmt((summary.total_amount ?? 0) / summary.total_orders) : '—'} color="amber" />
            </div>

            <ReportTable
                headers={['PO Date', 'PO No.', 'Supplier', 'Items', 'Total', 'Status']}
                empty={!orders?.length}
            >
                {orders?.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{fmtDate(o.po_date)}</td>
                        <td className="px-4 py-2 font-medium">{o.po_number}</td>
                        <td className="px-4 py-2">{o.supplier?.name ?? '—'}</td>
                        <td className="px-4 py-2 text-center">{o.items?.length ?? 0}</td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(o.total_amount)}</td>
                        <td className="px-4 py-2">{statusBadge(o.status)}</td>
                    </tr>
                ))}
                {orders?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={4} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-blue-700">{fmt(summary?.total_amount)}</td>
                        <td></td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

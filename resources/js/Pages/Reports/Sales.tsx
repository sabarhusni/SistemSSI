import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtDate, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, statusBadge, applyFilters, exportToExcel } from './_shared';

export default function Sales({ orders, summary, customers, users, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = today.slice(0, 8) + '01';

    const [f, setF] = useState({ from: filters?.from ?? firstDay, to: filters?.to ?? today, customer_id: filters?.customer_id ?? '', status: filters?.status ?? '', sales_person_id: filters?.sales_person_id ?? '' });

    const handleExport = () => exportToExcel('Sales_Report', [{
        name: 'Sales',
        headers: ['Order Date', 'SO No.', 'Customer', 'Sales', 'Items', 'Total', 'Status'],
        rows: (orders ?? []).map((o: any) => [
            o.order_date, o.so_number, o.customer?.name ?? '-', o.sales_person?.name ?? '-',
            o.items?.length ?? 0, Number(o.total_amount ?? 0), o.status,
        ]),
    }]);

    return (
        <AppLayout header="Sales Report">
            <Head title="Sales Report" />
            <FilterBar onApply={() => applyFilters('/reports/sales', f)} onExport={handleExport}>
                <FilterDate label="From" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="To" value={f.to} onChange={v => setF({ ...f, to: v })} />
                <FilterSelect label="Customer" value={f.customer_id} onChange={v => setF({ ...f, customer_id: v })}>
                    <option value="">All Customers</option>
                    {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FilterSelect>
                <FilterSelect label="Sales" value={f.sales_person_id} onChange={v => setF({ ...f, sales_person_id: v })}>
                    <option value="">All Sales</option>
                    {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </FilterSelect>
                <FilterSelect label="Status" value={f.status} onChange={v => setF({ ...f, status: v })}>
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </FilterSelect>
            </FilterBar>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <SummaryCard label="Total SO" value={summary?.total_orders?.toString() ?? '0'} color="gray" />
                <SummaryCard label="Total Revenue" value={fmt(summary?.total_revenue)} color="emerald" />
                <SummaryCard label="Average per SO" value={summary?.total_orders ? fmt((summary.total_revenue ?? 0) / summary.total_orders) : '—'} color="blue" />
            </div>

            <ReportTable
                headers={['Order Date', 'SO No.', 'Customer', 'Sales', 'Items', 'Total', 'Status']}
                empty={!orders?.length}
            >
                {orders?.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{fmtDate(o.order_date)}</td>
                        <td className="px-4 py-2 font-medium">{o.so_number}</td>
                        <td className="px-4 py-2">{o.customer?.name ?? '—'}</td>
                        <td className="px-4 py-2">{o.sales_person?.name ?? '—'}</td>
                        <td className="px-4 py-2 text-center">{o.items?.length ?? 0}</td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(o.total_amount)}</td>
                        <td className="px-4 py-2">{statusBadge(o.status)}</td>
                    </tr>
                ))}
                {orders?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={5} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(summary?.total_revenue)}</td>
                        <td></td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

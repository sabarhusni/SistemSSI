import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtNum, fmtDate, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, statusBadge, applyFilters, exportToExcel } from './_shared';

export default function Contract({ contracts, summary, customers, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const year = today.slice(0, 4);

    const [f, setF] = useState({
        from: filters?.from ?? `${year}-01-01`,
        to: filters?.to ?? `${year}-12-31`,
        customer_id: filters?.customer_id ?? '',
        status: filters?.status ?? '',
    });

    const salesName = (c: any) => c.sales_employee?.name ?? c.sales_name ?? '—';

    const handleExport = () => exportToExcel('Laporan_Kontrak', [{
        name: 'Kontrak',
        headers: ['No. Kontrak', 'Customer', 'Mulai', 'Selesai', 'Durasi (bln)', 'Sales', 'Nilai', 'SO', 'WO', 'Tertagih', 'Status'],
        rows: (contracts ?? []).map((c: any) => [
            c.contract_number, c.customer?.name ?? '-', c.start_date, c.end_date, c.duration_months ?? '',
            salesName(c), Number(c.contract_value ?? 0), c.sales_orders_count ?? 0, c.work_orders_count ?? 0,
            Number(c.invoices_sum_total_amount ?? 0), c.status,
        ]),
    }]);

    return (
        <AppLayout header="Laporan Kontrak">
            <Head title="Laporan Kontrak" />
            <FilterBar onApply={() => applyFilters('/reports/contract', f)} onExport={handleExport}>
                <FilterDate label="Dari" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="Sampai" value={f.to} onChange={v => setF({ ...f, to: v })} />
                <FilterSelect label="Customer" value={f.customer_id} onChange={v => setF({ ...f, customer_id: v })}>
                    <option value="">Semua Customer</option>
                    {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FilterSelect>
                <FilterSelect label="Status" value={f.status} onChange={v => setF({ ...f, status: v })}>
                    <option value="">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </FilterSelect>
            </FilterBar>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <SummaryCard label="Total Kontrak" value={fmtNum(summary?.total_contracts)} color="gray" />
                <SummaryCard label="Kontrak Aktif" value={fmtNum(summary?.by_status?.active ?? 0)} color="emerald" />
                <SummaryCard label="Nilai Kontrak" value={fmt(summary?.total_value)} color="blue" />
                <SummaryCard label="Total Tertagih" value={fmt(summary?.total_invoiced)} color="amber" />
            </div>

            <ReportTable
                headers={['No. Kontrak', 'Customer', 'Periode', 'Durasi', 'Sales', 'Nilai', 'SO', 'WO', 'Tertagih', 'Status']}
                empty={!contracts?.length}
            >
                {contracts?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">
                            <Link href={`/contracts/${c.id}`} className="text-blue-600 hover:underline">{c.contract_number}</Link>
                        </td>
                        <td className="px-4 py-2">{c.customer?.name ?? '—'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs">{fmtDate(c.start_date)} – {fmtDate(c.end_date)}</td>
                        <td className="px-4 py-2 text-center">{c.duration_months ?? '—'} bln</td>
                        <td className="px-4 py-2">{salesName(c)}</td>
                        <td className="px-4 py-2 text-right">{fmt(c.contract_value)}</td>
                        <td className="px-4 py-2 text-center">{c.sales_orders_count ?? 0}</td>
                        <td className="px-4 py-2 text-center">{c.work_orders_count ?? 0}</td>
                        <td className="px-4 py-2 text-right">{fmt(c.invoices_sum_total_amount)}</td>
                        <td className="px-4 py-2">{statusBadge(c.status)}</td>
                    </tr>
                ))}
                {contracts?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={5} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-blue-700">{fmt(summary?.total_value)}</td>
                        <td colSpan={2}></td>
                        <td className="px-4 py-2 text-right text-amber-700">{fmt(summary?.total_invoiced)}</td>
                        <td></td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

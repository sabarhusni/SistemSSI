import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtNum, fmtDate, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, statusBadge, applyFilters, exportToExcel } from './_shared';

export default function WorkOrder({ orders, summary, technicians, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = today.slice(0, 8) + '01';

    const [f, setF] = useState({
        from: filters?.from ?? firstDay,
        to: filters?.to ?? today,
        technician_id: filters?.technician_id ?? '',
        status: filters?.status ?? '',
    });

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const s = summary?.by_status ?? {};

    const handleExport = () => exportToExcel('Laporan_WorkOrder', [{
        name: 'Work Order',
        headers: ['Visit Date', 'Jam Masuk', 'Jam Keluar', 'WO No.', 'Kontrak', 'SO', 'Teknisi', 'Area', 'Jml Material', 'Biaya Material', 'Status'],
        rows: (orders ?? []).map((o: any) => [
            o.visit_date, o.time_in ?? '', o.time_out ?? '', o.wo_number, o.contract_number ?? '-',
            o.so_number ?? '-', o.technician ?? '-', o.service_area ?? '-', o.material_count ?? 0,
            Number(o.material_cost ?? 0), o.status,
        ]),
    }]);

    return (
        <AppLayout header="Laporan Work Order">
            <Head title="Laporan Work Order" />
            <FilterBar onApply={() => applyFilters('/reports/work-order', f)} onExport={handleExport}>
                <FilterDate label="Dari" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="Sampai" value={f.to} onChange={v => setF({ ...f, to: v })} />
                <FilterSelect label="Teknisi" value={f.technician_id} onChange={v => setF({ ...f, technician_id: v })}>
                    <option value="">Semua Teknisi</option>
                    {technicians?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </FilterSelect>
                <FilterSelect label="Status" value={f.status} onChange={v => setF({ ...f, status: v })}>
                    <option value="">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </FilterSelect>
            </FilterBar>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <SummaryCard label="Total WO" value={fmtNum(summary?.total_orders)} color="gray" />
                <SummaryCard label="Completed" value={fmtNum(s.completed ?? 0)} color="emerald" />
                <SummaryCard label="Pending / In Progress" value={fmtNum((s.pending ?? 0) + (s.in_progress ?? 0))} color="amber" />
                <SummaryCard label="Total Biaya Material" value={fmt(summary?.total_material_cost)} color="red" />
            </div>

            <ReportTable
                headers={['Visit Date', 'Jam', 'WO No.', 'Kontrak', 'SO', 'Teknisi', 'Area', 'Material', 'Biaya Material', 'Status', '']}
                empty={!orders?.length}
            >
                {orders?.map((o: any) => (
                    <>
                        <tr key={o.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap">{fmtDate(o.visit_date)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs tabular-nums">{o.time_in ? `${o.time_in}${o.time_out ? '–' + o.time_out : ''}` : '—'}</td>
                            <td className="px-4 py-2 font-medium">
                                <Link href={`/work-orders/${o.id}`} className="text-blue-600 hover:underline">{o.wo_number}</Link>
                            </td>
                            <td className="px-4 py-2">{o.contract_number ?? '—'}</td>
                            <td className="px-4 py-2 font-mono text-xs">{o.so_number ?? '—'}</td>
                            <td className="px-4 py-2">{o.technician ?? '—'}</td>
                            <td className="px-4 py-2">{o.service_area ?? '—'}</td>
                            <td className="px-4 py-2 text-center">{o.material_count ?? 0}</td>
                            <td className="px-4 py-2 text-right">{fmt(o.material_cost)}</td>
                            <td className="px-4 py-2">{statusBadge(o.status)}</td>
                            <td className="px-4 py-2 text-center">
                                {o.material_count > 0 && (
                                    <button
                                        onClick={() => toggleExpand(o.id)}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        {expanded[o.id] ? 'Hide' : 'Detail'}
                                    </button>
                                )}
                            </td>
                        </tr>
                        {expanded[o.id] && o.materials?.map((m: any, i: number) => (
                            <tr key={`${o.id}-${i}`} className="bg-blue-50 text-xs">
                                <td colSpan={6}></td>
                                <td className="px-4 py-1.5 text-gray-600">{m.product_name}</td>
                                <td className="px-4 py-1.5 text-center text-gray-500">{fmtNum(m.quantity_used)} {m.uom ?? ''}</td>
                                <td className="px-4 py-1.5 text-right font-medium">{fmt(m.cost)}</td>
                                <td colSpan={2}></td>
                            </tr>
                        ))}
                    </>
                ))}
                {orders?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={8} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-red-700">{fmt(summary?.total_material_cost)}</td>
                        <td colSpan={2}></td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

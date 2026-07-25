import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtNum, SummaryCard, FilterBar, FilterSelect, ReportTable, statusBadge, applyFilters, exportToExcel } from './_shared';

export default function Stock({ stocks, summary, categories, filters }: any) {
    const [f, setF] = useState({ product_type: filters?.product_type ?? '', category_id: filters?.category_id ?? '', search: filters?.search ?? '' });

    const handleExport = () => exportToExcel('Stock_Report', [{
        name: 'Stock',
        headers: ['Product', 'Category', 'Unit', 'Current Stock', 'Minimum Stock', 'Location', 'Stock Value', 'Status'],
        rows: (stocks ?? []).map((s: any) => [
            s.product?.name ?? '-', s.product?.category?.name ?? '-',
            s.product?.unit_of_measure?.symbol ?? s.product?.unit ?? '-',
            Number(s.quantity ?? 0), Number(s.minimum_stock ?? 0), s.warehouse_location ?? '-',
            Number(s.quantity ?? 0) * Number(s.product?.cost ?? 0), s.status,
        ]),
    }]);

    return (
        <AppLayout header="Stock Report">
            <Head title="Stock Report" />
            <FilterBar onApply={() => applyFilters('/reports/stock', f)} onExport={handleExport}>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Search Product</label>
                    <input
                        className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-48"
                        placeholder="Product name..."
                        value={f.search}
                        onChange={e => setF({ ...f, search: e.target.value })}
                    />
                </div>
                <FilterSelect label="Product Type" value={f.product_type} onChange={v => setF({ ...f, product_type: v })}>
                    <option value="">All Types</option>
                    <option value="goods">Goods</option>
                    <option value="service">Service</option>
                </FilterSelect>
                <FilterSelect label="Category" value={f.category_id} onChange={v => setF({ ...f, category_id: v })}>
                    <option value="">All Categories</option>
                    {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FilterSelect>
            </FilterBar>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <SummaryCard label="Total Products" value={fmtNum(summary?.total_products)} color="gray" />
                <SummaryCard label="Low Stock" value={fmtNum(summary?.low_stock)} color="red" sub="Below minimum stock" />
                <SummaryCard label="Stock Value" value={fmt(summary?.total_value)} color="emerald" sub="Based on cost price" />
            </div>

            <ReportTable
                headers={['Product', 'Category', 'Unit', 'Current Stock', 'Minimum Stock', 'Location', 'Stock Value', 'Status']}
                empty={!stocks?.length}
            >
                {stocks?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{s.product?.name ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-500">{s.product?.category?.name ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-500">{s.product?.unit_of_measure?.symbol ?? s.product?.unit ?? '—'}</td>
                        <td className="px-4 py-2 font-semibold text-right">{fmtNum(s.quantity)}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{fmtNum(s.minimum_stock)}</td>
                        <td className="px-4 py-2 text-gray-500">{s.warehouse_location ?? '—'}</td>
                        <td className="px-4 py-2 text-right">{fmt(s.quantity * (s.product?.cost ?? 0))}</td>
                        <td className="px-4 py-2">{statusBadge(s.status)}</td>
                    </tr>
                ))}
                {stocks?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={6} className="px-4 py-2 text-right">Total Value</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(summary?.total_value)}</td>
                        <td></td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

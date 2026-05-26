import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtNum, SummaryCard, FilterBar, FilterSelect, ReportTable, statusBadge, applyFilters } from './_shared';

export default function Stock({ stocks, summary, categories, filters }: any) {
    const [f, setF] = useState({ product_type: filters?.product_type ?? '', category_id: filters?.category_id ?? '', search: filters?.search ?? '' });

    return (
        <AppLayout header="Laporan Stok">
            <Head title="Laporan Stok" />
            <FilterBar onApply={() => applyFilters('/reports/stock', f)}>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Cari Produk</label>
                    <input
                        className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-48"
                        placeholder="Nama produk..."
                        value={f.search}
                        onChange={e => setF({ ...f, search: e.target.value })}
                    />
                </div>
                <FilterSelect label="Tipe Produk" value={f.product_type} onChange={v => setF({ ...f, product_type: v })}>
                    <option value="">Semua Tipe</option>
                    <option value="goods">Goods</option>
                    <option value="service">Service</option>
                </FilterSelect>
                <FilterSelect label="Kategori" value={f.category_id} onChange={v => setF({ ...f, category_id: v })}>
                    <option value="">Semua Kategori</option>
                    {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </FilterSelect>
            </FilterBar>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <SummaryCard label="Total Produk" value={fmtNum(summary?.total_products)} color="gray" />
                <SummaryCard label="Stok Rendah" value={fmtNum(summary?.low_stock)} color="red" sub="Di bawah minimum stok" />
                <SummaryCard label="Nilai Stok" value={fmt(summary?.total_value)} color="emerald" sub="Berdasarkan harga pokok" />
            </div>

            <ReportTable
                headers={['Produk', 'Kategori', 'Satuan', 'Stok Saat Ini', 'Stok Minimum', 'Lokasi', 'Nilai Stok', 'Status']}
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
                        <td colSpan={6} className="px-4 py-2 text-right">Total Nilai</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(summary?.total_value)}</td>
                        <td></td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}

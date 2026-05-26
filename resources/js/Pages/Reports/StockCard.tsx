import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmtDate, fmtNum, FilterBar, FilterDate, FilterSelect, applyFilters } from './_shared';

const IN_TYPES  = ['in', 'purchase', 'adjustment_in', 'opname_in', 'transfer_in'];
const OUT_TYPES = ['out', 'sale', 'adjustment_out', 'opname_out', 'transfer_out', 'wo_usage'];

const typeLabel: Record<string, string> = {
    in: 'Masuk', purchase: 'Pembelian', adjustment_in: 'Adj. Masuk', opname_in: 'Opname Masuk', transfer_in: 'Transfer Masuk',
    out: 'Keluar', sale: 'Penjualan', adjustment_out: 'Adj. Keluar', opname_out: 'Opname Keluar', transfer_out: 'Transfer Keluar', wo_usage: 'Pemakaian WO',
};

export default function StockCard({ movements, openingBalance, product, products, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = today.slice(0, 8) + '01';

    const [f, setF] = useState({ product_id: filters?.product_id ?? '', from: filters?.from ?? firstDay, to: filters?.to ?? today });

    let balance = openingBalance ?? 0;
    const rows = (movements ?? []).map((m: any) => {
        const isIn = IN_TYPES.includes(m.type);
        balance += isIn ? m.quantity : -m.quantity;
        return { ...m, isIn, balance };
    });

    const totalIn  = rows.filter((r: any) => r.isIn).reduce((s: number, r: any) => s + r.quantity, 0);
    const totalOut = rows.filter((r: any) => !r.isIn).reduce((s: number, r: any) => s + r.quantity, 0);

    return (
        <AppLayout header="Kartu Stok / Histori Stok">
            <Head title="Kartu Stok" />
            <FilterBar onApply={() => applyFilters('/reports/stock-card', f)}>
                <FilterSelect label="Produk" value={f.product_id} onChange={v => setF({ ...f, product_id: v })}>
                    <option value="">— Pilih Produk —</option>
                    {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </FilterSelect>
                <FilterDate label="Dari" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="Sampai" value={f.to} onChange={v => setF({ ...f, to: v })} />
            </FilterBar>

            {product && (
                <div className="bg-white rounded-xl shadow px-5 py-3 mb-4 flex items-center gap-6">
                    <div>
                        <p className="text-xs text-gray-500">Produk</p>
                        <p className="font-semibold text-gray-800">{product.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Satuan</p>
                        <p className="font-medium">{product.unit ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Saldo Awal Periode</p>
                        <p className="font-bold text-blue-700">{fmtNum(openingBalance)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Masuk</p>
                        <p className="font-bold text-emerald-700">+{fmtNum(totalIn)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Keluar</p>
                        <p className="font-bold text-red-600">-{fmtNum(totalOut)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Saldo Akhir</p>
                        <p className="font-bold text-gray-800">{fmtNum(balance)}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600 text-xs">
                            <th className="px-4 py-2.5">Tanggal</th>
                            <th className="px-4 py-2.5">Tipe</th>
                            <th className="px-4 py-2.5">Referensi</th>
                            <th className="px-4 py-2.5">Keterangan</th>
                            <th className="px-4 py-2.5 text-right text-emerald-600">Masuk</th>
                            <th className="px-4 py-2.5 text-right text-red-600">Keluar</th>
                            <th className="px-4 py-2.5 text-right">Saldo</th>
                            <th className="px-4 py-2.5">Oleh</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {!product && (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Pilih produk untuk melihat kartu stok.</td></tr>
                        )}
                        {product && rows.length === 0 && (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Tidak ada mutasi stok pada periode ini.</td></tr>
                        )}
                        {rows.map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2">{fmtDate(r.created_at?.slice(0, 10))}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                        {typeLabel[r.type] ?? r.type}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-gray-500 text-xs">{r.reference_type ?? '—'}</td>
                                <td className="px-4 py-2 text-gray-600">{r.notes ?? '—'}</td>
                                <td className="px-4 py-2 text-right font-medium text-emerald-700">{r.isIn ? fmtNum(r.quantity) : ''}</td>
                                <td className="px-4 py-2 text-right font-medium text-red-600">{!r.isIn ? fmtNum(r.quantity) : ''}</td>
                                <td className="px-4 py-2 text-right font-bold">{fmtNum(r.balance)}</td>
                                <td className="px-4 py-2 text-gray-500 text-xs">{r.created_by?.name ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}

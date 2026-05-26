import AppLayout from '@/Layouts/AppLayout';
import SortableColumn from '@/Components/SortableColumn';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ uoms, filters }: any) {
    const [search, setSearch] = useState(filters?.search ?? '');

    const sortProps = {
        currentSort: filters?.sort_by ?? 'created_at',
        currentDir: filters?.sort_dir ?? 'desc',
        routeName: 'unit-of-measures.index',
        filters: filters ?? {},
    };

    const doSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (filters?.sort_by) params.sort_by = filters.sort_by;
        if (filters?.sort_dir) params.sort_dir = filters.sort_dir;
        router.get('/unit-of-measures', params, { preserveState: true });
    };

    const handleDelete = (id: string) => {
        if (confirm('Yakin ingin menghapus satuan ini?')) {
            router.delete(`/unit-of-measures/${id}`);
        }
    };

    const fmtFactor = (n: any) => {
        const v = parseFloat(n);
        return isNaN(v) ? '—' : v.toLocaleString('id-ID', { maximumFractionDigits: 6 });
    };

    return (
        <AppLayout header="Unit of Measure">
            <Head title="Unit of Measure" />
            <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4 gap-3">
                    <form onSubmit={doSearch} className="flex gap-2">
                        <input
                            className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-64"
                            placeholder="Cari nama / simbol..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button type="submit" className="px-3 py-1.5 bg-gray-100 rounded-md text-sm hover:bg-gray-200">Cari</button>
                    </form>
                    <Link href="/unit-of-measures/create" className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700">
                        + Tambah Satuan
                    </Link>
                </div>

                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="name" label="Nama Satuan" {...sortProps} />
                            <SortableColumn sortKey="symbol" label="Simbol" {...sortProps} />
                            <th className="px-4 py-2">Konversi ke Satuan Terkecil</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-2 w-28"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {uoms.data?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                                    Belum ada data satuan.
                                </td>
                            </tr>
                        )}
                        {uoms.data?.map((uom: any) => (
                            <tr key={uom.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium">{uom.name}</td>
                                <td className="px-4 py-2 text-gray-500">{uom.symbol}</td>
                                <td className="px-4 py-2">
                                    {uom.base_uom_id ? (
                                        <span className="text-gray-700">
                                            1 <strong>{uom.symbol}</strong> = <strong>{fmtFactor(uom.conversion_factor)}</strong> {uom.base_unit?.name ?? ''} <span className="text-gray-400">({uom.base_unit?.symbol ?? ''})</span>
                                        </span>
                                    ) : (
                                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Satuan Terkecil</span>
                                    )}
                                </td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        uom.status === 'active'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {uom.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </td>
                                <td className="px-4 py-2 flex gap-2">
                                    <Link href={`/unit-of-measures/${uom.id}/edit`} className="text-blue-600 hover:underline text-xs">Edit</Link>
                                    <button onClick={() => handleDelete(uom.id)} className="text-red-500 hover:underline text-xs">Hapus</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {uoms.last_page > 1 && (
                    <div className="flex gap-1 mt-4 justify-end">
                        {uoms.links?.map((link: any, i: number) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                className={`px-3 py-1 rounded text-sm border ${
                                    link.active
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'text-gray-600 hover:bg-gray-50'
                                } ${!link.url ? 'opacity-40 pointer-events-none' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

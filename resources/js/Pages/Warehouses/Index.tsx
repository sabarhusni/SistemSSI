import AppLayout from '@/Layouts/AppLayout';
import SortableColumn from '@/Components/SortableColumn';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ warehouses, filters }: any) {
    const [search, setSearch] = useState(filters?.search ?? '');

    const sortProps = {
        currentSort: filters?.sort_by ?? 'code',
        currentDir:  filters?.sort_dir ?? 'asc',
        routeName:   'warehouses.index',
        filters:     filters ?? {},
    };

    const doSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (filters?.status) params.status = filters.status;
        if (filters?.sort_by) params.sort_by = filters.sort_by;
        if (filters?.sort_dir) params.sort_dir = filters.sort_dir;
        router.get('/warehouses', params, { preserveState: true });
    };

    const handleDelete = (id: string) => {
        if (confirm('Hapus gudang ini?')) {
            router.delete(`/warehouses/${id}`);
        }
    };

    return (
        <AppLayout header="Master Gudang">
            <Head title="Master Gudang" />
            <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4 gap-3">
                    <form onSubmit={doSearch} className="flex gap-2">
                        <input
                            className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-64"
                            placeholder="Cari kode / nama gudang..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <select
                            className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            value={filters?.status ?? ''}
                            onChange={e => {
                                const params: Record<string, string> = {};
                                if (search) params.search = search;
                                if (e.target.value) params.status = e.target.value;
                                if (filters?.sort_by) params.sort_by = filters.sort_by;
                                if (filters?.sort_dir) params.sort_dir = filters.sort_dir;
                                router.get('/warehouses', params, { preserveState: true });
                            }}
                        >
                            <option value="">Semua Status</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Tidak Aktif</option>
                        </select>
                        <button type="submit" className="px-3 py-1.5 bg-gray-100 rounded-md text-sm hover:bg-gray-200">Cari</button>
                    </form>
                    <Link href="/warehouses/create" className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                        + Tambah Gudang
                    </Link>
                </div>

                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="code"  label="Kode"   {...sortProps} />
                            <th className="px-4 py-2">Tipe</th>
                            <SortableColumn sortKey="name"  label="Nama Gudang" {...sortProps} />
                            <th className="px-4 py-2">Alamat</th>
                            <th className="px-4 py-2">Telepon</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-2 w-28"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {warehouses.data?.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                                    Belum ada data gudang.
                                </td>
                            </tr>
                        )}
                        {warehouses.data?.map((w: any) => (
                            <tr key={w.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-mono font-semibold text-gray-700">{w.code}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        w.type === 'pusat'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-orange-100 text-orange-700'
                                    }`}>
                                        {w.type === 'pusat' ? 'Pusat' : 'Cabang'}
                                    </span>
                                </td>
                                <td className="px-4 py-2 font-medium">{w.name}</td>
                                <td className="px-4 py-2 text-gray-500 max-w-xs truncate">{w.address ?? '—'}</td>
                                <td className="px-4 py-2 text-gray-500">{w.phone ?? '—'}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        w.status === 'active'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {w.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                                    </span>
                                </td>
                                <td className="px-4 py-2 flex gap-2">
                                    <Link href={`/warehouses/${w.id}/edit`} className="text-blue-600 hover:underline text-xs">Edit</Link>
                                    <button onClick={() => handleDelete(w.id)} className="text-red-500 hover:underline text-xs">Hapus</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {warehouses.last_page > 1 && (
                    <div className="flex gap-1 mt-4 justify-end">
                        {warehouses.links?.map((link: any, i: number) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                className={`px-3 py-1 rounded text-sm border ${
                                    link.active
                                        ? 'bg-red-600 text-white border-red-600'
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

import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

export default function Index({ suppliers, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'suppliers.index',
        filters,
    };

    return (
        <AppLayout header="Supplier">
            <Head title="Supplier" />
            <PageHeader title="Daftar Supplier" createHref="/suppliers/create" />
            <SearchFilter
                routeName="suppliers.index"
                filters={filters}
                filterOptions={[{ key: 'status', label: 'Semua Status', options: [{ label: 'Aktif', value: 'active' }, { label: 'Tidak Aktif', value: 'inactive' }] }]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="code" label="Kode" {...sortProps} />
                            <SortableColumn sortKey="name" label="Nama" {...sortProps} />
                            <SortableColumn sortKey="email" label="Email" {...sortProps} />
                            <th className="px-4 py-3">Telepon</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {suppliers.data?.map((s: any) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                                <td className="px-4 py-3 font-medium">{s.name}</td>
                                <td className="px-4 py-3 text-gray-500">{s.email}</td>
                                <td className="px-4 py-3">{s.phone}</td>
                                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/suppliers/${s.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/suppliers/${s.id}`} itemName={s.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {suppliers.links && <Pagination links={suppliers.links} from={suppliers.from} to={suppliers.to} total={suppliers.total} />}
        </AppLayout>
    );
}

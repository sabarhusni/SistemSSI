import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

export default function Index({ employees, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'name',
        currentDir: filters.sort_dir ?? 'asc',
        routeName: 'employees.index',
        filters,
    };

    return (
        <AppLayout header="Karyawan">
            <Head title="Karyawan" />
            <PageHeader title="Daftar Karyawan" createHref="/employees/create" />
            <SearchFilter
                routeName="employees.index"
                filters={filters}
                filterOptions={[{
                    key: 'status',
                    label: 'Semua Status',
                    options: [
                        { label: 'Aktif',     value: 'active' },
                        { label: 'Non-aktif', value: 'inactive' },
                    ],
                }]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="employee_number" label="No. Karyawan" {...sortProps} />
                            <SortableColumn sortKey="name" label="Nama" {...sortProps} />
                            <SortableColumn sortKey="position" label="Jabatan" {...sortProps} />
                            <SortableColumn sortKey="department" label="Divisi" {...sortProps} />
                            <th className="px-4 py-3">Telepon</th>
                            <SortableColumn sortKey="join_date" label="Tgl Bergabung" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {employees.data?.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                    Belum ada data karyawan.
                                </td>
                            </tr>
                        )}
                        {employees.data?.map((emp: any) => (
                            <tr key={emp.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{emp.employee_number}</td>
                                <td className="px-4 py-3 font-medium">{emp.name}</td>
                                <td className="px-4 py-3 text-gray-600">{emp.position ?? '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{emp.department ?? '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{emp.phone ?? '—'}</td>
                                <td className="px-4 py-3 text-gray-500">{emp.join_date ?? '—'}</td>
                                <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                                <td className="px-4 py-3 flex gap-3 items-center">
                                    <Link href={`/employees/${emp.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/employees/${emp.id}`} itemName={emp.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {employees.links && (
                <Pagination
                    links={employees.links}
                    from={employees.from}
                    to={employees.to}
                    total={employees.total}
                />
            )}
        </AppLayout>
    );
}

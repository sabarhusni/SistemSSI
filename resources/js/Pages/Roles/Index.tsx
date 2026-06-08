import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

export default function Index({ roles, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'roles.index',
        filters,
    };

    return (
        <AppLayout header="Role">
            <Head title="Role Management" />
            <PageHeader title="Role List" createHref="/roles/create" />
            <SearchFilter routeName="roles.index" filters={filters} filterOptions={[]} />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="name" label="Role Name" {...sortProps} />
                            <th className="px-4 py-3">Description</th>
                            <SortableColumn sortKey="users_count" label="Users" className="text-center" {...sortProps} />
                            <SortableColumn sortKey="permissions_count" label="Permissions" className="text-center" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {roles.data?.map((role: any) => (
                            <tr key={role.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{role.name}</td>
                                <td className="px-4 py-3 text-gray-500">{role.description ?? '-'}</td>
                                <td className="px-4 py-3 text-center">{role.users_count ?? 0}</td>
                                <td className="px-4 py-3 text-center">{role.permissions_count ?? 0}</td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/roles/${role.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/roles/${role.id}`} itemName={role.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {roles.links && <Pagination links={roles.links} from={roles.from} to={roles.to} total={roles.total} />}
        </AppLayout>
    );
}

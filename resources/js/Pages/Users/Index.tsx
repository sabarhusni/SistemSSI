import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

export default function Index({ users, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'users.index',
        filters,
    };

    return (
        <AppLayout header="User">
            <Head title="User Management" />
            <PageHeader title="User List" createHref="/users/create" />
            <SearchFilter routeName="users.index" filters={filters}
                filterOptions={[{ key: 'status', label: 'All Statuses', options: [
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="name" label="Name" {...sortProps} />
                            <SortableColumn sortKey="username" label="Username" {...sortProps} />
                            <SortableColumn sortKey="email" label="Email" {...sortProps} />
                            <th className="px-4 py-3">Role</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <SortableColumn sortKey="created_at" label="Registered" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.data?.map((user: any) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{user.name}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">{user.username}</td>
                                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                                <td className="px-4 py-3">
                                    {user.role
                                        ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{user.role.name}</span>
                                        : <span className="text-xs text-gray-400">—</span>
                                    }
                                </td>
                                <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{user.created_at?.substring(0, 10)}</td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/users/${user.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/users/${user.id}`} itemName={user.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {users.links && <Pagination links={users.links} from={users.from} to={users.to} total={users.total} />}
        </AppLayout>
    );
}

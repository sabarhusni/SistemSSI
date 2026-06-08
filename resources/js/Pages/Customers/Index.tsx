import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

export default function Index({ customers, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'customers.index',
        filters,
    };

    return (
        <AppLayout header="Customer">
            <Head title="Customer" />
            <PageHeader title="Customer List" createHref="/customers/create" />
            <SearchFilter
                routeName="customers.index"
                filters={filters}
                filterOptions={[{ key: 'status', label: 'All Statuses', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] }]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="code" label="Code" {...sortProps} />
                            <SortableColumn sortKey="name" label="Name / Company" {...sortProps} />
                            <SortableColumn sortKey="email" label="Email" {...sortProps} />
                            <th className="px-4 py-3">Phone</th>
                            <SortableColumn sortKey="city" label="City" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {customers.data?.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
                        ) : customers.data?.map((c: any) => (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium">{c.name}</div>
                                    {c.company_name && <div className="text-xs text-gray-400">{c.company_name}</div>}
                                </td>
                                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                                <td className="px-4 py-3">{c.phone}</td>
                                <td className="px-4 py-3">{c.city}</td>
                                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/customers/${c.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/customers/${c.id}`} itemName={c.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {customers.links && <Pagination links={customers.links} from={customers.from} to={customers.to} total={customers.total} />}
        </AppLayout>
    );
}

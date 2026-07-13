import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';
import { fmtDate } from '@/utils/date';

export default function Index({ stockOpnames, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'opname_date',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'stock-opnames.index',
        filters,
    };

    return (
        <AppLayout header="Stock Opname">
            <Head title="Stock Opname" />
            <PageHeader title="Stock Opname List" createHref="/stock-opnames/create" />
            <SearchFilter routeName="stock-opnames.index" filters={filters}
                filterOptions={[{ key: 'status', label: 'All Statuses', options: [
                    { label: 'Draft', value: 'draft' }, { label: 'In Progress', value: 'in_progress' },
                    { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="opname_number" label="Opname No." {...sortProps} />
                            <th className="px-4 py-3">Warehouse</th>
                            <SortableColumn sortKey="opname_date" label="Opname Date" {...sortProps} />
                            <th className="px-4 py-3">Conducted By</th>
                            <th className="px-4 py-3 text-right">Items</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {stockOpnames.data?.map((op: any) => (
                            <tr key={op.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{op.opname_number}</td>
                                <td className="px-4 py-3">{op.warehouse_model?.name ?? op.warehouse ?? '—'}</td>
                                <td className="px-4 py-3">{fmtDate(op.opname_date)}</td>
                                <td className="px-4 py-3 text-gray-500">{op.conducted_by?.name ?? '-'}</td>
                                <td className="px-4 py-3 text-right">{op.items_count ?? 0}</td>
                                <td className="px-4 py-3"><StatusBadge status={op.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/stock-opnames/${op.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/stock-opnames/${op.id}`} itemName={op.opname_number} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {stockOpnames.links && <Pagination links={stockOpnames.links} from={stockOpnames.from} to={stockOpnames.to} total={stockOpnames.total} />}
        </AppLayout>
    );
}

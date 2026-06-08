import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

export default function Index({ stockTransfers, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'stock-transfers.index',
        filters,
    };

    return (
        <AppLayout header="Stock Transfer">
            <Head title="Stock Transfer" />
            <PageHeader title="Stock Transfer List" createHref="/stock-transfers/create" />
            <SearchFilter routeName="stock-transfers.index" filters={filters}
                filterOptions={[{ key: 'status', label: 'All Statuses', options: [
                    { label: 'Draft', value: 'draft' }, { label: 'Sent', value: 'sent' },
                    { label: 'Received', value: 'received' }, { label: 'Cancelled', value: 'cancelled' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="transfer_number" label="Transfer No." {...sortProps} />
                            <th className="px-4 py-3">From Warehouse</th>
                            <th className="px-4 py-3">To Warehouse</th>
                            <SortableColumn sortKey="transfer_date" label="Transfer Date" {...sortProps} />
                            <th className="px-4 py-3">Processed By</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {stockTransfers.data?.map((tr: any) => (
                            <tr key={tr.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{tr.transfer_number}</td>
                                <td className="px-4 py-3">{tr.from_warehouse}</td>
                                <td className="px-4 py-3">{tr.to_warehouse}</td>
                                <td className="px-4 py-3">{tr.transfer_date}</td>
                                <td className="px-4 py-3 text-gray-500">{tr.processed_by?.name ?? '-'}</td>
                                <td className="px-4 py-3"><StatusBadge status={tr.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/stock-transfers/${tr.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/stock-transfers/${tr.id}`} itemName={tr.transfer_number} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {stockTransfers.links && <Pagination links={stockTransfers.links} from={stockTransfers.from} to={stockTransfers.to} total={stockTransfers.total} />}
        </AppLayout>
    );
}

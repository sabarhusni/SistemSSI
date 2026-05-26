import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

export default function Index({ workOrders, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'work-orders.index',
        filters,
    };

    return (
        <AppLayout header="Work Order">
            <Head title="Work Order" />
            <PageHeader title="Daftar Work Order" createHref="/work-orders/create" />
            <SearchFilter routeName="work-orders.index" filters={filters}
                filterOptions={[{ key: 'status', label: 'Semua Status', options: [
                    { label: 'Menunggu', value: 'pending' }, { label: 'Dikerjakan', value: 'in_progress' },
                    { label: 'Selesai', value: 'completed' }, { label: 'Dibatalkan', value: 'cancelled' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="wo_number" label="No. WO" {...sortProps} />
                            <th className="px-4 py-3">Ref. SO</th>
                            <th className="px-4 py-3">Teknisi</th>
                            <SortableColumn sortKey="visit_date" label="Tgl Kunjungan" {...sortProps} />
                            <th className="px-4 py-3">Area</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {workOrders.data?.map((wo: any) => (
                            <tr key={wo.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{wo.wo_number}</td>
                                <td className="px-4 py-3 text-gray-500">{wo.sales_order?.so_number ?? '-'}</td>
                                <td className="px-4 py-3">{wo.technician?.name}</td>
                                <td className="px-4 py-3">{wo.visit_date}</td>
                                <td className="px-4 py-3">{wo.service_area}</td>
                                <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/work-orders/${wo.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/work-orders/${wo.id}`} itemName={wo.wo_number} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {workOrders.links && <Pagination links={workOrders.links} from={workOrders.from} to={workOrders.to} total={workOrders.total} />}
        </AppLayout>
    );
}

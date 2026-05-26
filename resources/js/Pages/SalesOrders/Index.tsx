import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Index({ salesOrders, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'sales-orders.index',
        filters,
    };

    return (
        <AppLayout header="Sales Order">
            <Head title="Sales Order" />
            <PageHeader title="Daftar Sales Order" createHref="/sales-orders/create" />
            <SearchFilter routeName="sales-orders.index" filters={filters}
                filterOptions={[{ key: 'status', label: 'Semua Status', options: [
                    { label: 'Draft', value: 'draft' }, { label: 'Dikonfirmasi', value: 'confirmed' },
                    { label: 'Selesai', value: 'completed' }, { label: 'Dibatalkan', value: 'cancelled' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="so_number" label="No. SO" {...sortProps} />
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Sales</th>
                            <SortableColumn sortKey="service_date" label="Tgl Order" {...sortProps} />
                            <th className="px-4 py-3">Payment Term</th>
                            <SortableColumn sortKey="total_amount" label="Total" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {salesOrders.data?.map((so: any) => (
                            <tr key={so.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{so.so_number}</td>
                                <td className="px-4 py-3">{so.customer?.name}</td>
                                <td className="px-4 py-3 text-gray-500">{so.sales_person?.name ?? '-'}</td>
                                <td className="px-4 py-3">{so.service_date}</td>
                                <td className="px-4 py-3">{so.payment_term}</td>
                                <td className="px-4 py-3 text-right">{fmt(so.total_amount)}</td>
                                <td className="px-4 py-3"><StatusBadge status={so.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/sales-orders/${so.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/sales-orders/${so.id}`} itemName={so.so_number} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {salesOrders.links && <Pagination links={salesOrders.links} from={salesOrders.from} to={salesOrders.to} total={salesOrders.total} />}
        </AppLayout>
    );
}

import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';
import { fmtDate } from '@/utils/date';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Index({ purchaseOrders, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'po_date',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'purchase-orders.index',
        filters,
    };

    return (
        <AppLayout header="Purchase Order">
            <Head title="Purchase Order" />
            <PageHeader title="Purchase Order List" createHref="/purchase-orders/create" />
            <SearchFilter routeName="purchase-orders.index" filters={filters}
                filterOptions={[{ key: 'status', label: 'All Statuses', options: [
                    { label: 'Draft', value: 'draft' }, { label: 'Sent', value: 'sent' },
                    { label: 'Received', value: 'received' }, { label: 'Cancelled', value: 'cancelled' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="po_number" label="PO No." {...sortProps} />
                            <th className="px-4 py-3">Supplier</th>
                            <SortableColumn sortKey="po_date" label="PO Date" {...sortProps} />
                            <SortableColumn sortKey="expected_delivery_date" label="Exp. Delivery Date" {...sortProps} />
                            <SortableColumn sortKey="total_amount" label="Total" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {purchaseOrders.data?.map((po: any) => (
                            <tr key={po.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{po.po_number}</td>
                                <td className="px-4 py-3">{po.supplier?.name}</td>
                                <td className="px-4 py-3">{fmtDate(po.po_date)}</td>
                                <td className="px-4 py-3 text-gray-500">{fmtDate(po.expected_delivery_date)}</td>
                                <td className="px-4 py-3 text-right">{fmt(po.total_amount)}</td>
                                <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    {po.status === 'sent' && (
                                        <Link href={`/purchase-orders/${po.id}/receive`} className="text-red-600 hover:underline">Receive</Link>
                                    )}
                                    <Link href={`/purchase-orders/${po.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/purchase-orders/${po.id}`} itemName={po.po_number} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {purchaseOrders.links && <Pagination links={purchaseOrders.links} from={purchaseOrders.from} to={purchaseOrders.to} total={purchaseOrders.total} />}
        </AppLayout>
    );
}

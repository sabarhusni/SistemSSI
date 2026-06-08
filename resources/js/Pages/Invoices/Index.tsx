import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Index({ invoices, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'invoices.index',
        filters,
    };

    return (
        <AppLayout header="Invoice">
            <Head title="Invoice" />
            <PageHeader title="Invoice List" createHref="/invoices/create" />
            <SearchFilter routeName="invoices.index" filters={filters}
                filterOptions={[{ key: 'status', label: 'All Statuses', options: [
                    { label: 'Draft', value: 'draft' }, { label: 'Sent', value: 'sent' },
                    { label: 'Paid', value: 'paid' }, { label: 'Cancelled', value: 'cancelled' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="invoice_number" label="Invoice No." {...sortProps} />
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">SO Ref.</th>
                            <SortableColumn sortKey="invoice_date" label="Invoice Date" {...sortProps} />
                            <SortableColumn sortKey="due_date" label="Due Date" {...sortProps} />
                            <SortableColumn sortKey="total_amount" label="Total" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="paid_amount" label="Paid" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {invoices.data?.map((inv: any) => (
                            <tr key={inv.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{inv.invoice_number}</td>
                                <td className="px-4 py-3">{inv.customer?.name}</td>
                                <td className="px-4 py-3 text-gray-500">{inv.sales_order?.so_number ?? '-'}</td>
                                <td className="px-4 py-3">{inv.invoice_date}</td>
                                <td className="px-4 py-3">{inv.due_date}</td>
                                <td className="px-4 py-3 text-right">{fmt(inv.total_amount)}</td>
                                <td className="px-4 py-3 text-right text-emerald-700">{fmt(inv.paid_amount ?? 0)}</td>
                                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/invoices/${inv.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/invoices/${inv.id}`} itemName={inv.invoice_number} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {invoices.links && <Pagination links={invoices.links} from={invoices.from} to={invoices.to} total={invoices.total} />}
        </AppLayout>
    );
}

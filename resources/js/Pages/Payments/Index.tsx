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

export default function Index({ payments, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'payments.index',
        filters,
    };

    return (
        <AppLayout header="Payment">
            <Head title="Payment" />
            <PageHeader title="Payment List" createHref="/payments/create" />
            <SearchFilter routeName="payments.index" filters={filters}
                filterOptions={[{ key: 'payment_method', label: 'All Methods', options: [
                    { label: 'Bank Transfer', value: 'bank_transfer' },
                    { label: 'Cash', value: 'cash' },
                    { label: 'Cheque', value: 'cheque' },
                    { label: 'Giro', value: 'giro' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="payment_number" label="Payment No." {...sortProps} />
                            <th className="px-4 py-3">Invoice No.</th>
                            <th className="px-4 py-3">Customer</th>
                            <SortableColumn sortKey="payment_date" label="Payment Date" {...sortProps} />
                            <SortableColumn sortKey="payment_method" label="Method" {...sortProps} />
                            <SortableColumn sortKey="amount" label="Amount" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {payments.data?.map((pay: any) => (
                            <tr key={pay.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{pay.payment_number}</td>
                                <td className="px-4 py-3 text-gray-500">{pay.invoice?.invoice_number ?? '-'}</td>
                                <td className="px-4 py-3">{pay.invoice?.customer?.name ?? '-'}</td>
                                <td className="px-4 py-3">{fmtDate(pay.payment_date)}</td>
                                <td className="px-4 py-3 capitalize">{pay.payment_method?.replace('_', ' ')}</td>
                                <td className="px-4 py-3 text-right font-medium">{fmt(pay.amount)}</td>
                                <td className="px-4 py-3"><StatusBadge status={pay.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/payments/${pay.id}/edit`} className="text-blue-600 hover:underline">
                                        {pay.status === 'verified' ? 'View' : 'Edit'}
                                    </Link>
                                    {/* Pembayaran yang sudah Verified tidak dapat dihapus. */}
                                    {pay.status !== 'verified' && (
                                        <ConfirmDelete href={`/payments/${pay.id}`} itemName={pay.payment_number} />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {payments.links && <Pagination links={payments.links} from={payments.from} to={payments.to} total={payments.total} />}
        </AppLayout>
    );
}

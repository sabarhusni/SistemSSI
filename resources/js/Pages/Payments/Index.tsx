import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Index({ payments, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'payments.index',
        filters,
    };

    return (
        <AppLayout header="Pembayaran">
            <Head title="Pembayaran" />
            <PageHeader title="Daftar Pembayaran" createHref="/payments/create" />
            <SearchFilter routeName="payments.index" filters={filters}
                filterOptions={[{ key: 'payment_method', label: 'Semua Metode', options: [
                    { label: 'Transfer Bank', value: 'bank_transfer' },
                    { label: 'Tunai', value: 'cash' },
                    { label: 'Cek', value: 'cheque' },
                    { label: 'Giro', value: 'giro' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="payment_number" label="No. Pembayaran" {...sortProps} />
                            <th className="px-4 py-3">No. Invoice</th>
                            <th className="px-4 py-3">Customer</th>
                            <SortableColumn sortKey="payment_date" label="Tgl Bayar" {...sortProps} />
                            <SortableColumn sortKey="payment_method" label="Metode" {...sortProps} />
                            <SortableColumn sortKey="amount" label="Jumlah" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {payments.data?.map((pay: any) => (
                            <tr key={pay.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{pay.payment_number}</td>
                                <td className="px-4 py-3 text-gray-500">{pay.invoice?.invoice_number ?? '-'}</td>
                                <td className="px-4 py-3">{pay.invoice?.customer?.name ?? '-'}</td>
                                <td className="px-4 py-3">{pay.payment_date}</td>
                                <td className="px-4 py-3 capitalize">{pay.payment_method?.replace('_', ' ')}</td>
                                <td className="px-4 py-3 text-right font-medium">{fmt(pay.amount)}</td>
                                <td className="px-4 py-3"><StatusBadge status={pay.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/payments/${pay.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/payments/${pay.id}`} itemName={pay.payment_number} />
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

import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Index({ cashTransactions, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'transaction_date',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'cash-transactions.index',
        filters,
    };

    return (
        <AppLayout header="Cash">
            <Head title="Cash Transactions" />
            <PageHeader title="Cash Transactions" createHref="/cash-transactions/create" />
            <SearchFilter routeName="cash-transactions.index" filters={filters}
                filterOptions={[{ key: 'type', label: 'All Types', options: [
                    { label: 'In', value: 'in' },
                    { label: 'Out', value: 'out' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="transaction_date" label="Date" {...sortProps} />
                            <SortableColumn sortKey="type" label="Type" {...sortProps} />
                            <SortableColumn sortKey="category" label="Category" {...sortProps} />
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Reference</th>
                            <SortableColumn sortKey="amount" label="Amount" className="text-right" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {cashTransactions.data?.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{tx.transaction_date}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tx.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {tx.type === 'in' ? 'In' : 'Out'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{tx.category}</td>
                                <td className="px-4 py-3">{tx.description}</td>
                                <td className="px-4 py-3 text-gray-500">{tx.reference ?? '-'}</td>
                                <td className={`px-4 py-3 text-right font-medium ${tx.type === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {tx.type === 'in' ? '+' : '-'}{fmt(tx.amount)}
                                </td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/cash-transactions/${tx.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/cash-transactions/${tx.id}`} itemName={tx.description} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {cashTransactions.links && <Pagination links={cashTransactions.links} from={cashTransactions.from} to={cashTransactions.to} total={cashTransactions.total} />}
        </AppLayout>
    );
}

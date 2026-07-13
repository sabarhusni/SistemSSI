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

export default function Index({ bankTransactions, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'transaction_date',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'bank-transactions.index',
        filters,
    };

    return (
        <AppLayout header="Bank">
            <Head title="Bank Transactions" />
            <PageHeader title="Bank Transactions" createHref="/bank-transactions/create" />
            <SearchFilter routeName="bank-transactions.index" filters={filters}
                filterOptions={[
                    { key: 'type', label: 'All Types', options: [
                        { label: 'Credit (In)', value: 'credit' },
                        { label: 'Debit (Out)', value: 'debit' },
                    ]},
                    { key: 'reconciliation_status', label: 'Reconciliation', options: [
                        { label: 'Matched', value: 'matched' },
                        { label: 'Unmatched', value: 'unmatched' },
                        { label: 'Reconciled', value: 'reconciled' },
                    ]},
                ]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="transaction_date" label="Date" {...sortProps} />
                            <th className="px-4 py-3">Account</th>
                            <SortableColumn sortKey="type" label="Type" {...sortProps} />
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Reference</th>
                            <SortableColumn sortKey="amount" label="Amount" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="reconciliation_status" label="Reconciliation" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {bankTransactions.data?.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{fmtDate(tx.transaction_date)}</td>
                                <td className="px-4 py-3 text-xs">
                                    <div>{tx.bank_account?.bank_name}</div>
                                    <div className="text-gray-400">{tx.bank_account?.account_number}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {tx.type === 'credit' ? 'Credit' : 'Debit'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{tx.description}</td>
                                <td className="px-4 py-3 text-gray-500">{tx.reference ?? '-'}</td>
                                <td className={`px-4 py-3 text-right font-medium ${tx.type === 'credit' ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                                </td>
                                <td className="px-4 py-3"><StatusBadge status={tx.reconciliation_status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/bank-transactions/${tx.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/bank-transactions/${tx.id}`} itemName={tx.description} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {bankTransactions.links && <Pagination links={bankTransactions.links} from={bankTransactions.from} to={bankTransactions.to} total={bankTransactions.total} />}
        </AppLayout>
    );
}

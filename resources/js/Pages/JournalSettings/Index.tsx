import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link, usePage } from '@inertiajs/react';

const TYPE_LABELS: Record<string, string> = {
    asset:     'Asset',
    liability: 'Liability',
    equity:    'Equity',
    revenue:   'Revenue',
    expense:   'Expense',
};

const TYPE_COLORS: Record<string, string> = {
    asset:     'bg-blue-100 text-blue-700',
    liability: 'bg-orange-100 text-orange-700',
    equity:    'bg-purple-100 text-purple-700',
    revenue:   'bg-emerald-100 text-emerald-700',
    expense:   'bg-red-100 text-red-700',
};

export default function Index({ journalSettings, filters }: any) {
    const { flash } = usePage().props as any;

    const sortProps = {
        currentSort: filters.sort_by ?? 'account_code',
        currentDir: filters.sort_dir ?? 'asc',
        routeName: 'journal-settings.index',
        filters,
    };

    return (
        <AppLayout header="Journal Account">
            <Head title="Journal Account" />
            <PageHeader title="Journal Account List" createHref="/journal-settings/create" />

            {flash?.success && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                    {flash.success}
                </div>
            )}

            <SearchFilter
                routeName="journal-settings.index"
                filters={filters}
                filterOptions={[
                    {
                        key: 'account_type',
                        label: 'All Types',
                        options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value })),
                    },
                ]}
            />

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="account_code" label="Account Code" className="w-28" {...sortProps} />
                            <SortableColumn sortKey="account_name" label="Account Name" {...sortProps} />
                            <SortableColumn sortKey="account_type" label="Type" className="w-44" {...sortProps} />
                            <th className="px-4 py-3 w-28">Category</th>
                            <SortableColumn sortKey="is_active" label="Active" className="w-20 text-center" {...sortProps} />
                            <th className="px-4 py-3 w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {journalSettings.data?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                    No journal accounts yet. Click "+ Add" to create one.
                                </td>
                            </tr>
                        )}
                        {journalSettings.data?.map((js: any) => (
                            <tr key={js.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono font-semibold text-gray-800">{js.account_code}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-800">{js.account_name}</div>
                                    {js.description && (
                                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{js.description}</div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[js.account_type] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {TYPE_LABELS[js.account_type] ?? js.account_type}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs capitalize">
                                    {js.account_category ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${js.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                        {js.is_active ? '✓' : '✗'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/journal-settings/${js.id}/edit`} className="text-blue-600 hover:underline text-xs">Edit</Link>
                                    <ConfirmDelete href={`/journal-settings/${js.id}`} itemName={js.account_name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {journalSettings.links && (
                <Pagination
                    links={journalSettings.links}
                    from={journalSettings.from}
                    to={journalSettings.to}
                    total={journalSettings.total}
                />
            )}
        </AppLayout>
    );
}

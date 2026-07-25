import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link, usePage } from '@inertiajs/react';
import { fmtDate } from '@/utils/date';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// Duration in months between two dates (matches the contract form's derivation).
function monthsBetween(start: string, end: string): number | null {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    let m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) m -= 1;
    return m > 0 ? m : null;
}

const serviceTypeLabel = (v: string) => v === 'pest_control' ? 'Pest Control' : v === 'scenting' ? 'Scenting' : '—';
const serviceTypeCls = (v: string) => v === 'pest_control' ? 'bg-amber-100 text-amber-700' : v === 'scenting' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400';

export default function Index({ contracts, filters }: any) {
    const { flash } = usePage().props as any;
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'contracts.index',
        filters,
    };

    return (
        <AppLayout header="Contract">
            <Head title="Contract" />
            <PageHeader title="Contract List" createHref="/contracts/create" />
            {flash?.error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {flash.error}
                </div>
            )}
            <SearchFilter routeName="contracts.index" filters={filters}
                filterOptions={[
                    { key: 'status', label: 'All Statuses', options: [
                        { label: 'Draft', value: 'draft' }, { label: 'Active', value: 'active' },
                        { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
                    ]},
                    { key: 'service_type', label: 'All Services', options: [
                        { label: 'Pest Control', value: 'pest_control' }, { label: 'Scenting', value: 'scenting' },
                    ]},
                ]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="contract_number" label="Contract No." {...sortProps} />
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Services</th>
                            <SortableColumn sortKey="start_date" label="Start" {...sortProps} />
                            <th className="px-4 py-3 text-right">Duration (Months)</th>
                            <SortableColumn sortKey="end_date" label="End" {...sortProps} />
                            <SortableColumn sortKey="contract_value" label="Value" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {contracts.data?.map((c: any) => (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{c.contract_number}</td>
                                <td className="px-4 py-3">{c.customer?.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${serviceTypeCls(c.service_type)}`}>
                                        {serviceTypeLabel(c.service_type)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{fmtDate(c.start_date)}</td>
                                <td className="px-4 py-3 text-right">{c.duration_months ?? monthsBetween(c.start_date, c.end_date) ?? '—'}</td>
                                <td className="px-4 py-3">{fmtDate(c.end_date)}</td>
                                <td className="px-4 py-3 text-right">{fmt(c.contract_value)}</td>
                                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                <td className="px-4 py-3 flex gap-3 items-center">
                                    <Link
                                        href={`/contracts/${c.id}/edit`}
                                        className="text-blue-600 hover:underline"
                                        title={c.active_so_count > 0 ? 'Sales Order aktif — hanya dapat dilihat (read-only)' : undefined}
                                    >
                                        {c.active_so_count > 0 ? 'View' : 'Edit'}
                                    </Link>
                                    <a href={`/contracts/${c.id}/print`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline">Print</a>
                                    {c.active_so_count > 0 ? (
                                        <span
                                            className="text-gray-300 cursor-not-allowed text-sm font-medium"
                                            title="Sales Order aktif — kontrak tidak dapat dihapus"
                                        >
                                            Delete
                                        </span>
                                    ) : (
                                        <ConfirmDelete href={`/contracts/${c.id}`} itemName={c.contract_number} />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {contracts.links && <Pagination links={contracts.links} from={contracts.from} to={contracts.to} total={contracts.total} />}
        </AppLayout>
    );
}

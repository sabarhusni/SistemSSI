import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link, useForm } from '@inertiajs/react';

function GenerateWOButton({ contractId }: { contractId: string }) {
    const { post, processing } = useForm({});
    return (
        <button
            type="button"
            disabled={processing}
            onClick={() => post(`/contracts/${contractId}/generate-work-orders`)}
            className="text-emerald-600 hover:underline disabled:opacity-50 text-xs"
            title="Generate Work Order dari rencana kunjungan"
        >
            Gen WO
        </button>
    );
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Index({ contracts, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'contracts.index',
        filters,
    };

    return (
        <AppLayout header="Kontrak">
            <Head title="Kontrak" />
            <PageHeader title="Daftar Kontrak" createHref="/contracts/create" />
            <SearchFilter routeName="contracts.index" filters={filters}
                filterOptions={[{ key: 'status', label: 'Semua Status', options: [
                    { label: 'Draft', value: 'draft' }, { label: 'Aktif', value: 'active' },
                    { label: 'Selesai', value: 'completed' }, { label: 'Dibatalkan', value: 'cancelled' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="contract_number" label="No. Kontrak" {...sortProps} />
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Area</th>
                            <SortableColumn sortKey="start_date" label="Mulai" {...sortProps} />
                            <SortableColumn sortKey="end_date" label="Selesai" {...sortProps} />
                            <SortableColumn sortKey="contract_value" label="Nilai" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {contracts.data?.map((c: any) => (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{c.contract_number}</td>
                                <td className="px-4 py-3">{c.customer?.name}</td>
                                <td className="px-4 py-3 text-gray-500">{c.service_area}</td>
                                <td className="px-4 py-3">{c.start_date}</td>
                                <td className="px-4 py-3">{c.end_date}</td>
                                <td className="px-4 py-3 text-right">{fmt(c.contract_value)}</td>
                                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                <td className="px-4 py-3 flex gap-3 items-center">
                                    <Link href={`/contracts/${c.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    {c.status === 'active' && <GenerateWOButton contractId={c.id} />}
                                    <ConfirmDelete href={`/contracts/${c.id}`} itemName={c.contract_number} />
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

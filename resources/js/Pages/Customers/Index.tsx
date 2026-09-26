import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { exportToExcel } from '@/Pages/Reports/_shared';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ customers, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'customers.index',
        filters,
    };

    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams(
                Object.entries(filters ?? {}).filter(([, v]) => v != null && v !== '') as [string, string][]
            );
            const res = await fetch(`/customers/export?${params}`, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const rows: any[] = await res.json();
            exportToExcel('Master_Customer', [{
                name: 'Customers',
                headers: [
                    'Code', 'Contact Name', 'Contact Position', 'Company Name', 'NPWP', 'Email', 'Phone',
                    'Address', 'City', 'Province', 'Postal Code', 'Payment Method', 'Payment Terms',
                    'PIC Penagihan - Name', 'PIC Penagihan - Position', 'PIC Penagihan - Email', 'PIC Penagihan - Phone', 'PIC Penagihan - Address',
                    'Status', 'Notes',
                ],
                rows: rows.map(c => [
                    c.code, c.name, c.jabatan_kontak, c.company_name, c.npwp, c.email, c.phone,
                    c.address, c.city, c.province, c.postal_code, c.payment_method, c.payment_terms,
                    c.billing_pic_name, c.billing_pic_position, c.billing_pic_email, c.billing_pic_phone, c.billing_pic_address,
                    c.status, c.notes,
                ]),
            }]);
        } catch {
            alert('Export gagal, silakan coba lagi.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <AppLayout header="Customer">
            <Head title="Customer" />
            <PageHeader
                title="Customer List"
                createHref="/customers/create"
                actions={
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting}
                        className="inline-flex items-center gap-1 rounded-md border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-60 transition-colors"
                    >
                        {exporting ? 'Exporting...' : 'Export Excel'}
                    </button>
                }
            />
            <SearchFilter
                routeName="customers.index"
                filters={filters}
                filterOptions={[{ key: 'status', label: 'All Statuses', options: [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] }]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="code" label="Code" {...sortProps} />
                            <SortableColumn sortKey="name" label="Name / Company" {...sortProps} />
                            <SortableColumn sortKey="email" label="Email" {...sortProps} />
                            <th className="px-4 py-3">Phone</th>
                            <SortableColumn sortKey="city" label="City" {...sortProps} />
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {customers.data?.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
                        ) : customers.data?.map((c: any) => (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium">{c.name}</div>
                                    {c.company_name && <div className="text-xs text-gray-400">{c.company_name}</div>}
                                </td>
                                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                                <td className="px-4 py-3">{c.phone}</td>
                                <td className="px-4 py-3">{c.city}</td>
                                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/customers/${c.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/customers/${c.id}`} itemName={c.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {customers.links && <Pagination links={customers.links} from={customers.from} to={customers.to} total={customers.total} />}
        </AppLayout>
    );
}

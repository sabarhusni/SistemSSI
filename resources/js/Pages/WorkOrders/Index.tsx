import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';
import { fmtDate } from '@/utils/date';

const serviceTypeLabel = (v: string) => v === 'pest_control' ? 'Pest Control' : v === 'scenting' ? 'Scenting' : '—';
const serviceTypeCls = (v: string) => v === 'pest_control' ? 'bg-amber-100 text-amber-700' : v === 'scenting' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400';

export default function Index({ workOrders, filters, contracts = [], salesOrders = [] }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'work-orders.index',
        filters,
    };

    return (
        <AppLayout header="Work Order">
            <Head title="Work Order" />
            <PageHeader title="Work Order List" createHref="/work-orders/create" />
            <SearchFilter routeName="work-orders.index" filters={filters}
                filterOptions={[
                    { key: 'status', label: 'All Statuses', options: [
                        { label: 'Pending', value: 'pending' }, { label: 'In Progress', value: 'in_progress' },
                        { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
                    ]},
                    { key: 'contract_id', label: 'No Kontrak', type: 'picker', options: contracts.map((c: any) => ({ label: c.contract_number, value: c.id })) },
                    { key: 'sales_order_id', label: 'No SO', type: 'picker', options: salesOrders.map((s: any) => ({ label: s.so_number, value: s.id })) },
                    { key: 'service_type', label: 'All Services', options: [
                        { label: 'Pest Control', value: 'pest_control' }, { label: 'Scenting', value: 'scenting' },
                    ]},
                ]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="wo_number" label="WO No." {...sortProps} />
                            <th className="px-4 py-3">SO Ref.</th>
                            <th className="px-4 py-3">No Kontrak</th>
                            <th className="px-4 py-3">Tipe Service</th>
                            <th className="px-4 py-3">Technician</th>
                            <SortableColumn sortKey="visit_date" label="Visit Date" {...sortProps} />
                            <th className="px-4 py-3">Time In</th>
                            <th className="px-4 py-3">Time Out</th>
                            <th className="px-4 py-3">Area</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {workOrders.data?.map((wo: any) => (
                            <tr key={wo.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{wo.wo_number}</td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{wo.sales_order?.so_number ?? '-'}</td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{wo.contract?.contract_number ?? '-'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${serviceTypeCls(wo.contract?.service_type)}`}>
                                        {serviceTypeLabel(wo.contract?.service_type)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{wo.technician?.name}</td>
                                <td className="px-4 py-3">{fmtDate(wo.visit_date)}</td>
                                <td className="px-4 py-3">{wo.time_in ?? '-'}</td>
                                <td className="px-4 py-3">{wo.time_out ?? '-'}</td>
                                <td className="px-4 py-3">{wo.service_area}</td>
                                <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/work-orders/${wo.id}/edit`} className="text-blue-600 hover:underline">{wo.status === 'completed' ? 'View' : 'Edit'}</Link>
                                    <a href={`/work-orders/${wo.id}/print`} target="_blank" rel="noopener" className="text-gray-600 hover:underline">Print</a>
                                    {wo.status !== 'completed' && (
                                        <ConfirmDelete href={`/work-orders/${wo.id}`} itemName={wo.wo_number} />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {workOrders.links && <Pagination links={workOrders.links} from={workOrders.from} to={workOrders.to} total={workOrders.total} />}
        </AppLayout>
    );
}

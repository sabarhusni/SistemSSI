import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import StatusBadge from '@/Components/StatusBadge';
import VisitCalendar, { VisitEvent } from '@/Components/VisitCalendar';
import VisitVsWoChart, { VisitVsWoData } from '@/Components/VisitVsWoChart';

interface Stats {
    total_customers: number;
    total_active_contracts: number;
    total_collections: number;
    total_invoices: number;
    revenue_this_month: number;
    overdue_invoices: number;
}

interface WorkOrder {
    id: string; wo_number: string; visit_date: string;
    status: string; service_area: string;
    technician?: { name: string };
}

interface Invoice {
    id: string; invoice_number: string; due_date: string;
    total_amount: number; status: string;
    customer?: { name: string };
}

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const StatCard = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <div className={`rounded-xl p-5 text-white ${color} shadow`}>
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
);

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function Dashboard({
    stats,
    filters,
    activeServiceOrders = [],
    overdueInvoices = [],
    visitEvents = [],
    visitVsWoChart,
}: {
    stats: Stats;
    filters: { month: number; year: number };
    activeServiceOrders: WorkOrder[];
    overdueInvoices: Invoice[];
    visitEvents: VisitEvent[];
    visitVsWoChart: VisitVsWoData;
}) {
    const thisYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => thisYear + 1 - i);
    if (!years.includes(filters.year)) years.push(filters.year);

    const applyFilter = (next: Partial<{ month: number; year: number }>) => {
        router.get('/dashboard', { ...filters, ...next }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const periodLabel = `${MONTHS[filters.month - 1]} ${filters.year}`;

    return (
        <AppLayout header="Dashboard">
            <Head title="Dashboard" />

            {/* Filter periode */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-600">Periode:</span>
                <select
                    value={filters.month}
                    onChange={(e) => applyFilter({ month: Number(e.target.value) })}
                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select
                    value={filters.year}
                    onChange={(e) => applyFilter({ year: Number(e.target.value) })}
                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                    {years.sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
                <StatCard label="Total Customers"     value={stats.total_customers}        color="bg-blue-500" />
                <StatCard label="Active Contracts"    value={stats.total_active_contracts}  color="bg-emerald-500" />
                <StatCard label={`Revenue ${periodLabel}`} value={fmt(stats.revenue_this_month)} color="bg-teal-500" />
                <StatCard label="Invoices"       value={fmt(stats.total_invoices)}          color="bg-orange-500" />
                <StatCard label="Collections"    value={fmt(stats.total_collections)}       color="bg-violet-500" />
                <StatCard label="Overdue Invoices"    value={fmt(stats.overdue_invoices)}        color="bg-red-500" />
            </div>

            {/* Kalender Jadwal Visit Plan */}
            <div className="mb-6">
                <VisitCalendar events={visitEvents} />
            </div>

            {/* Grafik Visit Plan vs Work Order */}
            {visitVsWoChart && (
                <div className="mb-6">
                    <VisitVsWoChart data={visitVsWoChart} />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Active Service Orders */}
                <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800">Active Work Orders</h3>
                        <Link href="/work-orders" className="text-sm text-red-600 hover:underline">View all</Link>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">WO No.</th>
                                <th className="pb-2">Technician</th>
                                <th className="pb-2">Date</th>
                                <th className="pb-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeServiceOrders.length === 0 ? (
                                <tr><td colSpan={4} className="py-4 text-center text-gray-400">No data</td></tr>
                            ) : activeServiceOrders.map((wo) => (
                                <tr key={wo.id} className="border-b last:border-0">
                                    <td className="py-2">
                                        <Link href={`/work-orders/${wo.id}`} className="text-blue-600 hover:underline">{wo.wo_number}</Link>
                                    </td>
                                    <td className="py-2">{wo.technician?.name ?? '-'}</td>
                                    <td className="py-2">{wo.visit_date}</td>
                                    <td className="py-2"><StatusBadge status={wo.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Overdue Invoices */}
                <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800">Overdue Invoices – {periodLabel}</h3>
                        <Link href="/invoices" className="text-sm text-red-600 hover:underline">View all</Link>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">Invoice No.</th>
                                <th className="pb-2">Customer</th>
                                <th className="pb-2">Due Date</th>
                                <th className="pb-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overdueInvoices.length === 0 ? (
                                <tr><td colSpan={4} className="py-4 text-center text-gray-400">No data</td></tr>
                            ) : overdueInvoices.map((inv) => (
                                <tr key={inv.id} className="border-b last:border-0">
                                    <td className="py-2">
                                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">{inv.invoice_number}</Link>
                                    </td>
                                    <td className="py-2">{inv.customer?.name ?? '-'}</td>
                                    <td className="py-2 text-red-600">{inv.due_date}</td>
                                    <td className="py-2 text-right">{fmt(inv.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}

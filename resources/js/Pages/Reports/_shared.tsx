import { router } from '@inertiajs/react';
import * as XLSX from 'xlsx';

export const fmt = (n: any) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const fmtNum = (n: any) =>
    Number(n ?? 0).toLocaleString('id-ID');

export const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtMonth = (m: string) => {
    if (!m) return '—';
    const [y, mon] = m.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[parseInt(mon) - 1]} ${y}`;
};

export function SummaryCard({ label, value, sub, color = 'emerald' }: { label: string; value: string; sub?: string; color?: string }) {
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        blue:    'bg-blue-50 border-blue-200 text-blue-700',
        red:     'bg-red-50 border-red-200 text-red-700',
        amber:   'bg-amber-50 border-amber-200 text-amber-700',
        gray:    'bg-gray-50 border-gray-200 text-gray-700',
    };
    return (
        <div className={`rounded-lg border px-4 py-3 ${colors[color] ?? colors.gray}`}>
            <p className="text-xs font-medium opacity-70">{label}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
    );
}

export function FilterBar({ children, onApply, onExport }: { children: React.ReactNode; onApply: () => void; onExport?: () => void }) {
    return (
        <div className="bg-white rounded-xl shadow px-5 py-4 mb-4 flex flex-wrap items-end gap-3">
            {children}
            <button
                type="button"
                onClick={onApply}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
                Show
            </button>
            {onExport && (
                <button
                    type="button"
                    onClick={onExport}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700"
                >
                    📊 Export Excel
                </button>
            )}
            <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
            >
                🖨 Print
            </button>
        </div>
    );
}

/**
 * Client-side Excel export. Each sheet gets its own tab; cell values are passed
 * as raw strings/numbers (not pre-formatted) so Excel can sort/sum them natively.
 */
export type ExcelSheet = {
    name: string;
    headers: string[];
    rows: (string | number | null | undefined)[][];
};

export function exportToExcel(filename: string, sheets: ExcelSheet[]) {
    const wb = XLSX.utils.book_new();
    sheets.forEach(sheet => {
        const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows.map(r => r.map(v => v ?? ''))]);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
    });
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`);
}

export function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{label}</label>
            <input
                type="date"
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

export function FilterSelect({ label, value, onChange, children }: {
    label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{label}</label>
            <select
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                {children}
            </select>
        </div>
    );
}

export function ReportTable({ headers, children, empty }: {
    headers: string[]; children: React.ReactNode; empty?: boolean;
}) {
    return (
        <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-gray-600 text-xs">
                        {headers.map((h, i) => (
                            <th key={i} className="px-4 py-2.5">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                    {empty ? (
                        <tr>
                            <td colSpan={headers.length} className="px-4 py-8 text-center text-gray-400">
                                No data for the selected filters.
                            </td>
                        </tr>
                    ) : children}
                </tbody>
            </table>
        </div>
    );
}

export const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        draft:      'bg-gray-100 text-gray-600',
        confirmed:  'bg-blue-100 text-blue-700',
        completed:  'bg-emerald-100 text-emerald-700',
        cancelled:  'bg-red-100 text-red-600',
        active:     'bg-emerald-100 text-emerald-700',
        sent:       'bg-blue-100 text-blue-700',
        received:   'bg-emerald-100 text-emerald-700',
        paid:       'bg-emerald-100 text-emerald-700',
        pending:    'bg-amber-100 text-amber-700',
        in_progress:'bg-blue-100 text-blue-700',
        low:        'bg-red-100 text-red-600',
        normal:     'bg-emerald-100 text-emerald-700',
    };
    const labels: Record<string, string> = {
        draft: 'Draft', confirmed: 'Confirmed', completed: 'Completed',
        cancelled: 'Cancelled', active: 'Active', sent: 'Sent',
        received: 'Received', paid: 'Paid', pending: 'Pending', in_progress: 'In Progress',
        low: 'Low Stock', normal: 'Normal',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
            {labels[status] ?? status}
        </span>
    );
};

export function applyFilters(url: string, filters: Record<string, string>) {
    router.get(url, filters, { preserveState: true, replace: true });
}

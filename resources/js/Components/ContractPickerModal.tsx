import { useState, useRef, useEffect, useMemo } from 'react';

interface Props {
    contracts: any[];
    onSelect: (contract: any) => void;
    onClose: () => void;
}

const statusLabel = (s: string) =>
    ({ draft: 'Draft', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' }[s] ?? s);

const statusCls = (s: string) =>
    ({
        draft:     'bg-gray-100 text-gray-600',
        active:    'bg-emerald-100 text-emerald-700',
        completed: 'bg-blue-100 text-blue-700',
        cancelled: 'bg-red-100 text-red-600',
    }[s] ?? 'bg-gray-100 text-gray-600');

export default function ContractPickerModal({ contracts, onSelect, onClose }: Props) {
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return contracts;
        return contracts.filter(c =>
            c.contract_number?.toLowerCase().includes(q) ||
            c.customer?.name?.toLowerCase().includes(q)
        );
    }, [search, contracts]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">Select Contract</span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="Search by contract number or customer name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">No contracts found.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b">
                                <tr className="text-left text-gray-500 text-xs">
                                    <th className="px-4 py-2">Contract No.</th>
                                    <th className="px-3 py-2">Customer</th>
                                    <th className="px-3 py-2">Period</th>
                                    <th className="px-3 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((c: any) => (
                                    <tr
                                        key={c.id}
                                        className="hover:bg-red-50 cursor-pointer"
                                        onClick={() => { onSelect(c); onClose(); }}
                                    >
                                        <td className="px-4 py-2 font-mono text-xs font-medium text-gray-800">{c.contract_number}</td>
                                        <td className="px-3 py-2 text-gray-700">{c.customer?.name ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                                            {c.start_date} – {c.end_date}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCls(c.status)}`}>
                                                {statusLabel(c.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>{filtered.length} contracts found</span>
                    <span>Press <kbd className="px-1 py-0.5 border rounded text-gray-500">Esc</kbd> to close</span>
                </div>
            </div>
        </div>
    );
}

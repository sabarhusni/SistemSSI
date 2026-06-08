import { useState, useRef, useEffect, useMemo } from 'react';

interface Props {
    items: any[];                       // item service SO (parent saja)
    soNumber?: string;
    activeMonth?: number | null;        // bulan yang boleh dipilih (berurutan)
    currentMonth?: number | null;       // bulan item yang sedang terpilih (edit)
    onSelect: (item: any) => void;
    onClose: () => void;
}

export default function SalesOrderItemPickerModal({ items, soNumber, activeMonth = null, currentMonth = null, onSelect, onClose }: Props) {
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
        const base = [...items].sort((a, b) => (a.month ?? 0) - (b.month ?? 0));
        if (!q) return base;
        return base.filter(it =>
            it.product?.name?.toLowerCase().includes(q) ||
            it.product?.code?.toLowerCase().includes(q) ||
            String(it.month ?? '').includes(q)
        );
    }, [search, items]);

    const monthOf = (it: any) => Number(it.month) || 1;
    const isSelectable = (it: any) => {
        const m = monthOf(it);
        if (currentMonth != null && m === currentMonth) return true;
        if (activeMonth == null) return false;
        return m === activeMonth;
    };
    const reasonFor = (it: any) => {
        const m = monthOf(it);
        if (activeMonth != null && m > activeMonth) return 'Belum giliran';
        return 'Selesai';
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">
                        Pilih Item Service SO {soNumber ? <span className="font-mono text-xs text-gray-500">({soNumber})</span> : null}
                    </span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="Cari berdasarkan nama produk atau bulan..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada item service.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b">
                                <tr className="text-left text-gray-500 text-xs">
                                    <th className="px-4 py-2 w-16 text-center">Bulan</th>
                                    <th className="px-3 py-2">Product</th>
                                    <th className="px-3 py-2 w-20">Qty</th>
                                    <th className="px-3 py-2 w-20">Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((it: any) => {
                                    const ok = isSelectable(it);
                                    return (
                                        <tr
                                            key={it.id}
                                            className={ok ? 'hover:bg-red-50 cursor-pointer' : 'bg-gray-50 cursor-not-allowed'}
                                            onClick={ok ? () => { onSelect(it); onClose(); } : undefined}
                                            title={ok ? undefined : 'Bulan harus dipilih berurutan dari yang terkecil'}
                                        >
                                            <td className={`px-4 py-2 text-center font-medium ${ok ? 'text-gray-700' : 'text-gray-400'}`}>{it.month ?? '—'}</td>
                                            <td className={`px-3 py-2 ${ok ? 'text-gray-800' : 'text-gray-400'}`}>
                                                {it.product?.name ?? '—'}
                                                {!ok && <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">({reasonFor(it)})</span>}
                                            </td>
                                            <td className={`px-3 py-2 ${ok ? 'text-gray-600' : 'text-gray-400'}`}>{it.quantity}</td>
                                            <td className={`px-3 py-2 text-xs ${ok ? 'text-gray-500' : 'text-gray-400'}`}>{it.uom ?? '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>{filtered.length} item</span>
                    <span>Press <kbd className="px-1 py-0.5 border rounded text-gray-500">Esc</kbd> to close</span>
                </div>
            </div>
        </div>
    );
}

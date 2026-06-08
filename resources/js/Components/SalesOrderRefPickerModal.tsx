import { useState, useRef, useEffect, useMemo } from 'react';

interface Props {
    salesOrders: any[];       // SO berstatus confirmed pada kontrak terpilih
    customerName?: string;    // customer kontrak (sama untuk semua SO)
    onSelect: (so: any) => void;
    onClose: () => void;
}

export default function SalesOrderRefPickerModal({ salesOrders, customerName, onSelect, onClose }: Props) {
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
        if (!q) return salesOrders;
        return salesOrders.filter((so: any) =>
            so.so_number?.toLowerCase().includes(q) ||
            so.premise?.location?.toLowerCase().includes(q) ||
            so.premise?.address?.toLowerCase().includes(q) ||
            so.premise?.pic?.toLowerCase().includes(q)
        );
    }, [search, salesOrders]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">Pilih Referensi Sales Order (Confirmed)</span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="Cari No SO, lokasi, alamat, atau PIC premis..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada Sales Order confirmed.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b">
                                <tr className="text-left text-gray-500 text-xs">
                                    <th className="px-4 py-2">No SO</th>
                                    <th className="px-3 py-2">Customer</th>
                                    <th className="px-3 py-2">Premis Lokasi</th>
                                    <th className="px-3 py-2">Premis Alamat</th>
                                    <th className="px-3 py-2">Premis PIC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((so: any) => (
                                    <tr
                                        key={so.id}
                                        className="hover:bg-red-50 cursor-pointer"
                                        onClick={() => { onSelect(so); onClose(); }}
                                    >
                                        <td className="px-4 py-2 font-mono text-xs font-medium text-gray-800">{so.so_number}</td>
                                        <td className="px-3 py-2 text-gray-700">{customerName ?? so.customer?.name ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-700">{so.premise?.location ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-500 text-xs">{so.premise?.address ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-700">{so.premise?.pic ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>{filtered.length} SO</span>
                    <span>Press <kbd className="px-1 py-0.5 border rounded text-gray-500">Esc</kbd> to close</span>
                </div>
            </div>
        </div>
    );
}

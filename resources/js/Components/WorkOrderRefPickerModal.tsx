import { useState, useRef, useEffect, useMemo } from 'react';

interface Props {
    workOrders: any[];        // WO completed pada kontrak terpilih (sudah di-flatten dg so_number & premise)
    customerName?: string;    // customer kontrak (sama untuk semua WO)
    selectedIds: string[];    // WO yang sudah terpilih sebelumnya (dicentang saat modal dibuka)
    onConfirm: (ids: string[]) => void;
    onClose: () => void;
}

export default function WorkOrderRefPickerModal({ workOrders, customerName, selectedIds, onConfirm, onClose }: Props) {
    const [search, setSearch] = useState('');
    const [picked, setPicked] = useState<string[]>(selectedIds ?? []);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return workOrders;
        return workOrders.filter((wo: any) =>
            wo.wo_number?.toLowerCase().includes(q) ||
            wo.so_number?.toLowerCase().includes(q) ||
            wo.premise?.location?.toLowerCase().includes(q) ||
            wo.premise?.address?.toLowerCase().includes(q) ||
            wo.premise?.pic?.toLowerCase().includes(q)
        );
    }, [search, workOrders]);

    const toggle = (id: string) => {
        setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const allFilteredPicked = filtered.length > 0 && filtered.every((wo: any) => picked.includes(wo.id));
    const toggleAllFiltered = () => {
        if (allFilteredPicked) {
            const filteredIds = new Set(filtered.map((wo: any) => wo.id));
            setPicked(prev => prev.filter(id => !filteredIds.has(id)));
        } else {
            const merged = new Set(picked);
            filtered.forEach((wo: any) => merged.add(wo.id));
            setPicked(Array.from(merged));
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">Pilih Referensi Work Order (Completed)</span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="Cari No WO, No SO, lokasi, alamat, atau PIC premis..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada Work Order completed.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b">
                                <tr className="text-left text-gray-500 text-xs">
                                    <th className="px-4 py-2 w-8">
                                        <input type="checkbox" checked={allFilteredPicked} onChange={toggleAllFiltered} />
                                    </th>
                                    <th className="px-3 py-2">No WO</th>
                                    <th className="px-3 py-2">No SO</th>
                                    <th className="px-3 py-2 text-center">Visit ke</th>
                                    <th className="px-3 py-2">Customer</th>
                                    <th className="px-3 py-2">Premis Lokasi</th>
                                    <th className="px-3 py-2">Premis Alamat</th>
                                    <th className="px-3 py-2">Premis PIC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((wo: any) => (
                                    <tr
                                        key={wo.id}
                                        className="hover:bg-red-50 cursor-pointer"
                                        onClick={() => toggle(wo.id)}
                                    >
                                        <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={picked.includes(wo.id)} onChange={() => toggle(wo.id)} />
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs font-medium text-gray-800">{wo.wo_number}</td>
                                        <td className="px-3 py-2 font-mono text-xs text-gray-600">{wo.so_number ?? '—'}</td>
                                        <td className="px-3 py-2 text-center text-gray-700">{wo.month ?? 1}</td>
                                        <td className="px-3 py-2 text-gray-700">{customerName ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-700">{wo.premise?.location ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-500 text-xs">{wo.premise?.address ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-700">{wo.premise?.pic ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-4 py-3 border-t flex items-center justify-between">
                    <span className="text-xs text-gray-400">{filtered.length} WO · {picked.length} dipilih</span>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                            Batal
                        </button>
                        <button type="button" onClick={() => onConfirm(picked)}
                            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                            Terapkan ({picked.length} dipilih)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

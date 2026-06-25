import { useState, useRef, useEffect, useMemo } from 'react';

interface Props {
    premises: any[];
    onSelect: (premise: any) => void;
    onClose: () => void;
    // Premis yang sudah tersimpan pada Sales Order lain — tidak dapat dipilih lagi.
    usedIds?: (string | number)[];
}

export default function PremisePickerModal({ premises, onSelect, onClose, usedIds = [] }: Props) {
    const usedSet = useMemo(() => new Set(usedIds.map(String)), [usedIds]);
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
        if (!q) return premises;
        return premises.filter(p =>
            p.location?.toLowerCase().includes(q) ||
            p.address?.toLowerCase().includes(q) ||
            p.pic?.toLowerCase().includes(q)
        );
    }, [search, premises]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">Pilih Premis</span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="Cari berdasarkan lokasi, alamat, atau PIC..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada premis pada kontrak ini.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b">
                                <tr className="text-left text-gray-500 text-xs">
                                    <th className="px-4 py-2">Lokasi</th>
                                    <th className="px-3 py-2">Alamat</th>
                                    <th className="px-3 py-2">PIC</th>
                                    <th className="px-3 py-2 text-center">Visit Freq.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((p: any) => {
                                    const used = usedSet.has(String(p.id));
                                    return (
                                        <tr
                                            key={p.id}
                                            className={used ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 cursor-pointer'}
                                            onClick={() => { if (used) return; onSelect(p); onClose(); }}
                                        >
                                            <td className="px-4 py-2 font-medium text-gray-800">
                                                {p.location ?? '—'}
                                                {used && <span className="ml-2 text-[10px] font-normal px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">sudah dipakai SO</span>}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600 text-xs">{p.address ?? '—'}</td>
                                            <td className="px-3 py-2 text-gray-600">{p.pic ?? '—'}</td>
                                            <td className="px-3 py-2 text-center text-emerald-700 font-medium">{(p.visit_frequency ?? 0)}×/bln</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>{filtered.length} premis</span>
                    <span>Tekan <kbd className="px-1 py-0.5 border rounded text-gray-500">Esc</kbd> untuk menutup</span>
                </div>
            </div>
        </div>
    );
}

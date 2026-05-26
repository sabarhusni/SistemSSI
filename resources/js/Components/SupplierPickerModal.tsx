import { useState, useRef, useEffect, useMemo } from 'react';

interface Props {
    suppliers: any[];
    onSelect:  (supplier: any) => void;
    onClose:   () => void;
}

export default function SupplierPickerModal({ suppliers, onSelect, onClose }: Props) {
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
        if (!q) return suppliers;
        return suppliers.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.code?.toLowerCase().includes(q) ||
            s.phone?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q)
        );
    }, [search, suppliers]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">Pilih Supplier</span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Cari nama, kode, telepon, atau email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Supplier tidak ditemukan.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b">
                                <tr className="text-left text-gray-500 text-xs">
                                    <th className="px-4 py-2">Nama</th>
                                    <th className="px-3 py-2">Kode</th>
                                    <th className="px-3 py-2">Telepon</th>
                                    <th className="px-3 py-2">Email</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((s: any) => (
                                    <tr
                                        key={s.id}
                                        className="hover:bg-emerald-50 cursor-pointer"
                                        onClick={() => { onSelect(s); onClose(); }}
                                    >
                                        <td className="px-4 py-2 font-medium text-gray-800">{s.name}</td>
                                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{s.code ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-500 text-xs">{s.phone ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-500 text-xs">{s.email ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>{filtered.length} supplier ditemukan</span>
                    <span>Tekan <kbd className="px-1 py-0.5 border rounded text-gray-500">Esc</kbd> untuk tutup</span>
                </div>
            </div>
        </div>
    );
}

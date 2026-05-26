import { useState, useRef, useEffect, useMemo } from 'react';

interface Props {
    customers: any[];
    onSelect: (customer: any) => void;
    onClose: () => void;
}

export default function CustomerPickerModal({ customers, onSelect, onClose }: Props) {
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
        if (!q) return customers;
        return customers.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q)
        );
    }, [search, customers]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">Pilih Customer</span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Cari nama, email, atau telepon..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Customer tidak ditemukan.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b">
                                <tr className="text-left text-gray-500 text-xs">
                                    <th className="px-4 py-2">Nama</th>
                                    <th className="px-3 py-2">Email</th>
                                    <th className="px-3 py-2">Telepon</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((c: any) => (
                                    <tr
                                        key={c.id}
                                        className="hover:bg-emerald-50 cursor-pointer"
                                        onClick={() => { onSelect(c); onClose(); }}
                                    >
                                        <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                                        <td className="px-3 py-2 text-gray-500 text-xs">{c.email ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-500 text-xs">{c.phone ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>{filtered.length} customer ditemukan</span>
                    <span>Tekan <kbd className="px-1 py-0.5 border rounded text-gray-500">Esc</kbd> untuk tutup</span>
                </div>
            </div>
        </div>
    );
}

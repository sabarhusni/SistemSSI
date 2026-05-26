import { useState, useRef, useEffect, useMemo } from 'react';

const fmt = (n: any) =>
    n != null
        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n))
        : null;

interface Props {
    products: any[];
    onSelect: (product: any) => void;
    onClose: () => void;
    /** Label untuk kolom nilai tambahan — default otomatis berdasarkan data */
    extraLabel?: string;
    /** Key field produk yang ditampilkan di kolom nilai tambahan */
    extraKey?: string;
    /** Format nilai kolom tambahan: 'currency' | 'number' | 'text' */
    extraFormat?: 'currency' | 'number' | 'text';
}

export default function ProductPickerModal({
    products,
    onSelect,
    onClose,
    extraLabel,
    extraKey,
    extraFormat = 'currency',
}: Props) {
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    // Tutup modal saat tekan Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return products;
        return products.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.code?.toLowerCase().includes(q) ||
            p.unit?.toLowerCase().includes(q)
        );
    }, [search, products]);

    const renderExtra = (p: any) => {
        if (!extraKey) return null;
        const val = p[extraKey];
        if (val == null) return <span className="text-gray-300">—</span>;
        if (extraFormat === 'currency') return <span className="text-gray-700">{fmt(val)}</span>;
        if (extraFormat === 'number')   return <span className="text-gray-700">{Number(val).toLocaleString('id-ID')}</span>;
        return <span className="text-gray-700">{val}</span>;
    };

    const hasType  = products.some(p => p.product_type);
    const hasUnit  = products.some(p => p.unit);
    const hasExtra = !!extraKey;

    const colCount = 1 + (hasUnit ? 1 : 0) + (hasType ? 1 : 0) + (hasExtra ? 1 : 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">Pilih Produk</span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Cari nama atau kode produk..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Produk tidak ditemukan.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 border-b">
                                <tr className="text-left text-gray-500 text-xs">
                                    <th className="px-4 py-2">Nama Produk</th>
                                    {hasUnit  && <th className="px-3 py-2 w-16">Satuan</th>}
                                    {hasType  && <th className="px-3 py-2 w-20">Tipe</th>}
                                    {hasExtra && <th className="px-3 py-2 w-28 text-right">{extraLabel ?? extraKey}</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map((p: any) => (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-emerald-50 cursor-pointer"
                                        onClick={() => { onSelect(p); onClose(); }}
                                    >
                                        <td className="px-4 py-2">
                                            <span className="font-medium text-gray-800">{p.name}</span>
                                            {p.code && <span className="ml-2 text-xs text-gray-400">{p.code}</span>}
                                        </td>
                                        {hasUnit && (
                                            <td className="px-3 py-2 text-gray-500 text-xs">{p.unit ?? '—'}</td>
                                        )}
                                        {hasType && (
                                            <td className="px-3 py-2">
                                                {p.product_type ? (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        p.product_type === 'service'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {p.product_type === 'service' ? 'Service' : 'Goods'}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        )}
                                        {hasExtra && (
                                            <td className="px-3 py-2 text-right">{renderExtra(p)}</td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>{filtered.length} produk ditemukan</span>
                    <span>Tekan <kbd className="px-1 py-0.5 border rounded text-gray-500">Esc</kbd> untuk tutup</span>
                </div>
            </div>
        </div>
    );
}

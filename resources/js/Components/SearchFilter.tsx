import { router } from '@inertiajs/react';
import { useEffect, useRef, useState, useMemo } from 'react';

interface FilterOption { label: string; value: string }
interface FilterGroup {
    key: string;
    label: string;
    options: FilterOption[];
    type?: 'select' | 'picker';   // 'picker' = popup window dialog
}

interface Props {
    routeName: string;
    filters?: Record<string, string>;
    filterOptions?: FilterGroup[];
}

// Popup window dialog untuk memilih satu opsi filter (dengan pencarian).
function FilterPickerModal({ group, current, onSelect, onClose }: {
    group: FilterGroup; current: string; onSelect: (v: string) => void; onClose: () => void;
}) {
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
        if (!q) return group.options;
        return group.options.filter(o => o.label.toLowerCase().includes(q));
    }, [search, group.options]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-gray-800">Pilih {group.label}</span>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="px-4 py-3 border-b">
                    <input
                        ref={inputRef}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder={`Cari ${group.label.toLowerCase()}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-y-auto flex-1">
                    <button
                        type="button"
                        onClick={() => { onSelect(''); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-red-50 ${!current ? 'font-semibold text-red-600' : 'text-gray-500'}`}
                    >
                        Semua {group.label}
                    </button>
                    {filtered.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada data.</p>
                    ) : (
                        filtered.map(o => (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => onSelect(o.value)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-red-50 ${current === o.value ? 'bg-red-50 font-medium text-gray-900' : 'text-gray-700'}`}
                            >
                                {o.label}
                            </button>
                        ))
                    )}
                </div>

                <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>{filtered.length} data</span>
                    <span>Press <kbd className="px-1 py-0.5 border rounded text-gray-500">Esc</kbd> to close</span>
                </div>
            </div>
        </div>
    );
}

export default function SearchFilter({ routeName, filters = {}, filterOptions = [] }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
        Object.fromEntries(filterOptions.map((f) => [f.key, filters[f.key] ?? '']))
    );
    const [pickerKey, setPickerKey] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const apply = (newSearch: string, newFilters: Record<string, string>) => {
        const params: Record<string, string> = {};
        if (newSearch) params.search = newSearch;
        Object.entries(newFilters).forEach(([k, v]) => { if (v) params[k] = v; });
        if (filters.sort_by) params.sort_by = filters.sort_by;
        if (filters.sort_dir) params.sort_dir = filters.sort_dir;
        router.get(route(routeName), params, { preserveState: true, replace: true });
    };

    useEffect(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => apply(search, activeFilters), 400);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [search]);

    const handleFilter = (key: string, value: string) => {
        const updated = { ...activeFilters, [key]: value };
        setActiveFilters(updated);
        apply(search, updated);
    };

    const labelFor = (group: FilterGroup) => {
        const v = activeFilters[group.key];
        if (!v) return group.label;
        return group.options.find(o => o.value === v)?.label ?? group.label;
    };

    const activeGroup = filterOptions.find(f => f.key === pickerKey) ?? null;

    return (
        <div className="flex flex-wrap gap-3 mb-4">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 w-64"
            />
            {filterOptions.map((f) => (
                f.type === 'picker' ? (
                    <div key={f.key} className="flex items-center">
                        <button
                            type="button"
                            onClick={() => setPickerKey(f.key)}
                            className={`rounded-md border px-3 py-2 text-sm shadow-sm hover:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-500 ${activeFilters[f.key] ? 'border-red-300 bg-red-50 text-gray-800' : 'border-gray-300 text-gray-500'}`}
                        >
                            {labelFor(f)}
                        </button>
                        {activeFilters[f.key] && (
                            <button
                                type="button"
                                onClick={() => handleFilter(f.key, '')}
                                className="ml-1 text-gray-400 hover:text-gray-600 text-lg leading-none"
                                title="Hapus filter"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ) : (
                    <select
                        key={f.key}
                        value={activeFilters[f.key]}
                        onChange={(e) => handleFilter(f.key, e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                        <option value="">{f.label}</option>
                        {f.options.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                )
            ))}

            {activeGroup && (
                <FilterPickerModal
                    group={activeGroup}
                    current={activeFilters[activeGroup.key] ?? ''}
                    onSelect={(v) => { handleFilter(activeGroup.key, v); setPickerKey(null); }}
                    onClose={() => setPickerKey(null)}
                />
            )}
        </div>
    );
}

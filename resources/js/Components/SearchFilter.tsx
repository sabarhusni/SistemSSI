import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface FilterOption { label: string; value: string }

interface Props {
    routeName: string;
    filters?: Record<string, string>;
    filterOptions?: { key: string; label: string; options: FilterOption[] }[];
}

export default function SearchFilter({ routeName, filters = {}, filterOptions = [] }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
        Object.fromEntries(filterOptions.map((f) => [f.key, filters[f.key] ?? '']))
    );
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

    return (
        <div className="flex flex-wrap gap-3 mb-4">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari..."
                className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-64"
            />
            {filterOptions.map((f) => (
                <select
                    key={f.key}
                    value={activeFilters[f.key]}
                    onChange={(e) => handleFilter(f.key, e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                    <option value="">{f.label}</option>
                    {f.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            ))}
        </div>
    );
}

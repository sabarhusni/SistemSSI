import { router } from '@inertiajs/react';

interface Props {
    sortKey: string;
    label: string;
    currentSort: string;
    currentDir: string;
    routeName: string;
    filters: Record<string, string>;
    className?: string;
}

export default function SortableColumn({ sortKey, label, currentSort, currentDir, routeName, filters, className }: Props) {
    const isActive = currentSort === sortKey;
    const nextDir = isActive && currentDir === 'asc' ? 'desc' : 'asc';

    const handleSort = () => {
        const params: Record<string, string> = {};
        Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
        params.sort_by = sortKey;
        params.sort_dir = nextDir;
        router.get(route(routeName), params, { preserveState: true, replace: true });
    };

    return (
        <th
            className={`px-4 py-3 cursor-pointer select-none hover:bg-gray-100 ${className ?? ''}`}
            onClick={handleSort}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <span className="text-gray-400 text-xs">
                    {isActive ? (currentDir === 'asc' ? '↑' : '↓') : '↕'}
                </span>
            </span>
        </th>
    );
}

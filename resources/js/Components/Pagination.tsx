import { Link } from '@inertiajs/react';

interface PaginationLink { url: string | null; label: string; active: boolean }

interface Props {
    links: PaginationLink[];
    from: number;
    to: number;
    total: number;
}

export default function Pagination({ links, from, to, total }: Props) {
    return (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <p>Showing {from}–{to} of {total} records</p>
            <div className="flex gap-1">
                {links.map((link, i) => (
                    link.url ? (
                        <Link
                            key={i}
                            href={link.url}
                            preserveState
                            className={`px-3 py-1 rounded border text-sm ${
                                link.active
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-white border-gray-300 hover:bg-gray-50'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ) : (
                        <span
                            key={i}
                            className="px-3 py-1 rounded border border-gray-200 text-gray-400 bg-gray-50 text-sm"
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    )
                ))}
            </div>
        </div>
    );
}

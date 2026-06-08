import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';

interface Props {
    title: string;
    createHref?: string;
    createLabel?: string;
    actions?: ReactNode;
}

export default function PageHeader({ title, createHref, createLabel = 'Add New', actions }: Props) {
    return (
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <div className="flex items-center gap-2">
                {actions}
                {createHref && (
                    <Link
                        href={createHref}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                    >
                        <span>+</span> {createLabel}
                    </Link>
                )}
            </div>
        </div>
    );
}

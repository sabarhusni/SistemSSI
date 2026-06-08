import { ReactNode } from 'react';

interface Props {
    label: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
}

export default function FormField({ label, error, required, children }: Props) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

// Shared input className
export const inputCls =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-50';

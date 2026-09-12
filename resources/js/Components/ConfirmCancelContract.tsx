import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Props { href: string; itemName?: string }

export default function ConfirmCancelContract({ href, itemName = 'this contract' }: Props) {
    const [open, setOpen] = useState(false);

    const handleCancel = () => {
        router.patch(href, {}, { onFinish: () => setOpen(false) });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
                Cancel Contract
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Cancel Contract</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to cancel <strong>{itemName}</strong>? This will also cancel every
                            related Sales Order, Work Order, and Invoice, and reject any unverified Payment. This
                            action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Keep Contract
                            </button>
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                            >
                                Cancel Contract
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

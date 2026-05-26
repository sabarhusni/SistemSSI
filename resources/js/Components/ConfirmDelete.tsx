import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Props { href: string; itemName?: string }

export default function ConfirmDelete({ href, itemName = 'data ini' }: Props) {
    const [open, setOpen] = useState(false);

    const handleDelete = () => {
        router.delete(href, { onFinish: () => setOpen(false) });
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
                Hapus
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi Hapus</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Apakah Anda yakin ingin menghapus <strong>{itemName}</strong>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

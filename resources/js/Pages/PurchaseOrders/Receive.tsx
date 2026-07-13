import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Receive({ purchaseOrder, warehouses }: any) {
    const isReceived = purchaseOrder.status === 'received';

    const { data, setData, post, processing } = useForm<any>({
        warehouse_id: '',
        items: purchaseOrder.items.map((item: any) => ({
            id:          item.id,
            receive_qty: 0,
        })),
    });

    const updateQty = (i: number, qty: number) => {
        const items = [...data.items];
        items[i] = { ...items[i], receive_qty: qty };
        setData('items', items);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isReceived) return;
        post(`/purchase-orders/${purchaseOrder.id}/receive`);
    };

    return (
        <AppLayout header="Receive Goods">
            <Head title="Receive Goods" />

            <div className="max-w-3xl bg-white rounded-xl shadow p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-2">
                    <div>
                        <span className="font-medium text-gray-500">PO No.:</span>{' '}
                        <span className="font-semibold">{purchaseOrder.po_number}</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-500">Supplier:</span>{' '}
                        {purchaseOrder.supplier?.name}
                    </div>
                    <div>
                        <span className="font-medium text-gray-500">PO Date:</span>{' '}
                        {purchaseOrder.po_date}
                    </div>
                    <div>
                        <span className="font-medium text-gray-500">Status:</span>{' '}
                        <span className="capitalize">{purchaseOrder.status}</span>
                    </div>
                </div>

                {isReceived && (
                    <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
                        ✓ Semua barang telah diterima. Purchase Order ini sudah selesai dan tidak bisa diubah lagi.
                    </div>
                )}

                <form onSubmit={submit}>
                    <div className="mb-4">
                        <FormField label="Terima ke Gudang">
                            <select
                                className={inputCls}
                                value={data.warehouse_id}
                                onChange={e => setData('warehouse_id', e.target.value)}
                                disabled={isReceived}
                            >
                                <option value="">— Pilih Gudang (opsional) —</option>
                                {warehouses?.map((w: any) => (
                                    <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <div className="border rounded-lg overflow-hidden mb-4">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-left text-gray-600">
                                    <th className="px-4 py-2">Product</th>
                                    <th className="px-4 py-2 w-20">Unit</th>
                                    <th className="px-4 py-2 w-24 text-right">PO Qty</th>
                                    <th className="px-4 py-2 w-28 text-right">Received</th>
                                    <th className="px-4 py-2 w-32 text-right">Remaining</th>
                                    <th className="px-4 py-2 w-32">Receive Now</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {purchaseOrder.items.map((item: any, i: number) => {
                                    const remaining = item.quantity - (item.received_qty ?? 0);
                                    const conversionFactor = Number(item.conversion_factor) || 1;
                                    const receiveQty = data.items[i]?.receive_qty ?? 0;
                                    const showConversion = item.base_uom?.id && item.base_uom.id !== item.uom?.id;
                                    return (
                                        <tr key={item.id} className={remaining <= 0 ? 'bg-gray-50 text-gray-400' : ''}>
                                            <td className="px-4 py-2">{item.product?.name ?? '—'}</td>
                                            <td className="px-4 py-2 text-gray-500">{item.uom?.symbol ?? '—'}</td>
                                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right">{item.received_qty ?? 0}</td>
                                            <td className="px-4 py-2 text-right font-medium">
                                                <span className={remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                                                    {remaining > 0 ? remaining : '✓ Complete'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={remaining}
                                                    disabled={isReceived || remaining <= 0}
                                                    value={receiveQty}
                                                    onChange={e => updateQty(i, Math.min(+e.target.value, remaining))}
                                                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                />
                                                {showConversion && receiveQty > 0 && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        = {receiveQty * conversionFactor} {item.base_uom?.symbol}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-3">
                        {!isReceived && (
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                            >
                                {processing ? 'Saving...' : 'Save Receipt'}
                            </button>
                        )}
                        <Link
                            href="/purchase-orders"
                            className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            {isReceived ? 'Kembali' : 'Cancel'}
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

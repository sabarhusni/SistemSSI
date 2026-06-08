import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

const WAREHOUSES = ['Main Warehouse', 'Jakarta Branch Warehouse', 'Surabaya Branch Warehouse', 'Field Warehouse'];

export default function Form({ stockTransfer, products, users }: any) {
    const editing = !!stockTransfer;
    const { data, setData, post, put, processing, errors } = useForm<any>({
        transfer_number:  stockTransfer?.transfer_number  ?? '',
        from_warehouse:   stockTransfer?.from_warehouse   ?? '',
        to_warehouse:     stockTransfer?.to_warehouse     ?? '',
        transfer_date:    stockTransfer?.transfer_date    ?? '',
        processed_by_id:  stockTransfer?.processed_by_id  ?? '',
        status:           stockTransfer?.status           ?? 'draft',
        notes:            stockTransfer?.notes            ?? '',
        items: stockTransfer?.items ?? [{ product_id: '', quantity: 1 }],
    });

    const updateItem = (i: number, field: string, value: any) => {
        const items = [...data.items];
        items[i] = { ...items[i], [field]: value };
        setData('items', items);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/stock-transfers/${stockTransfer.id}`) : post('/stock-transfers');
    };

    return (
        <AppLayout header={editing ? 'Edit Stock Transfer' : 'Create Stock Transfer'}>
            <Head title="Stock Transfer" />
            <div className="max-w-3xl bg-white rounded-xl shadow p-6 space-y-4">
                <form onSubmit={submit}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <FormField label="Transfer No." error={errors.transfer_number} required>
                            <input className={inputCls} value={data.transfer_number} onChange={e => setData('transfer_number', e.target.value)} />
                        </FormField>
                        <FormField label="Transfer Date" error={errors.transfer_date} required>
                            <input type="date" className={inputCls} value={data.transfer_date} onChange={e => setData('transfer_date', e.target.value)} />
                        </FormField>
                        <FormField label="From Warehouse" error={errors.from_warehouse} required>
                            <select className={inputCls} value={data.from_warehouse} onChange={e => setData('from_warehouse', e.target.value)}>
                                <option value="">— Select Source Warehouse —</option>
                                {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </FormField>
                        <FormField label="To Warehouse" error={errors.to_warehouse} required>
                            <select className={inputCls} value={data.to_warehouse} onChange={e => setData('to_warehouse', e.target.value)}>
                                <option value="">— Select Destination Warehouse —</option>
                                {WAREHOUSES.filter(w => w !== data.from_warehouse).map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Processed By">
                            <select className={inputCls} value={data.processed_by_id} onChange={e => setData('processed_by_id', e.target.value)}>
                                <option value="">— Select Staff —</option>
                                {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="received">Received</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </FormField>
                    </div>

                    <h3 className="font-semibold text-gray-700 mb-2">Transfer Items</h3>
                    <div className="border rounded-lg overflow-hidden mb-2">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-left text-gray-600">
                                    <th className="px-3 py-2">Product</th>
                                    <th className="px-3 py-2 w-28">Qty</th>
                                    <th className="px-3 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.items.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2">
                                            <select className={inputCls} value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                                                <option value="">— Select Product —</option>
                                                {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="number" min={1} className={inputCls} value={item.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} />
                                        </td>
                                        <td className="px-3 py-2">
                                            <button type="button" onClick={() => setData('items', data.items.filter((_: any, idx: number) => idx !== i))} className="text-red-500 text-lg">×</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button type="button" onClick={() => setData('items', [...data.items, { product_id: '', quantity: 1 }])} className="text-sm text-red-600 hover:underline mb-4">+ Add Item</button>

                    <FormField label="Notes">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                        <Link href="/stock-transfers" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

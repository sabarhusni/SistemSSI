import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

const WAREHOUSES = ['Main Warehouse', 'Jakarta Branch Warehouse', 'Surabaya Branch Warehouse', 'Field Warehouse'];

export default function Form({ stockOpname, products, users, nextNumber }: any) {
    const editing = !!stockOpname;
    const { data, setData, post, put, processing, errors } = useForm<any>({
        opname_number:    stockOpname?.opname_number    ?? nextNumber ?? '',
        warehouse:        stockOpname?.warehouse        ?? '',
        opname_date:      stockOpname?.opname_date      ?? '',
        conducted_by_id:  stockOpname?.conducted_by_id  ?? '',
        status:           stockOpname?.status           ?? 'draft',
        notes:            stockOpname?.notes            ?? '',
        items: stockOpname?.items?.map((item: any) => ({
            product_id:       item.product_id,
            system_quantity:  item.quantity_system,
            physical_quantity: item.quantity_physical,
        })) ?? [],
    });

    const updateItem = (i: number, field: string, value: any) => {
        const items = [...data.items];
        items[i] = { ...items[i], [field]: value };
        setData('items', items);
    };

    const addAllProducts = () => {
        if (!products?.length) return;
        const existingIds = new Set(data.items.map((it: any) => it.product_id));
        const newItems = products
            .filter((p: any) => !existingIds.has(p.id))
            .map((p: any) => ({ product_id: p.id, system_quantity: p.stock, physical_quantity: p.stock }));
        setData('items', [...data.items, ...newItems]);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/stock-opnames/${stockOpname.id}`) : post('/stock-opnames');
    };

    return (
        <AppLayout header={editing ? 'Edit Stock Opname' : 'Stock Opname'}>
            <Head title="Stock Opname" />
            <div className="max-w-4xl bg-white rounded-xl shadow p-6 space-y-4">
                <form onSubmit={submit}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <FormField label="Opname No." error={errors.opname_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.opname_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Opname Date" error={errors.opname_date} required>
                            <input type="date" className={inputCls} value={data.opname_date} onChange={e => setData('opname_date', e.target.value)} />
                        </FormField>
                        <FormField label="Warehouse" error={errors.warehouse} required>
                            <select className={inputCls} value={data.warehouse} onChange={e => setData('warehouse', e.target.value)}>
                                <option value="">— Select Warehouse —</option>
                                {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Conducted By">
                            <select className={inputCls} value={data.conducted_by_id} onChange={e => setData('conducted_by_id', e.target.value)}>
                                <option value="">— Select Staff —</option>
                                {users?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status} onChange={e => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </FormField>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-700">Opname Items</h3>
                        <div className="flex gap-2">
                            <button type="button" onClick={addAllProducts} className="text-xs text-red-600 border border-red-300 px-3 py-1 rounded hover:bg-red-50">
                                + Load All Products
                            </button>
                            <button type="button" onClick={() => setData('items', [...data.items, { product_id: '', system_quantity: 0, physical_quantity: 0 }])} className="text-xs text-blue-600 border border-blue-300 px-3 py-1 rounded hover:bg-blue-50">
                                + Add Manually
                            </button>
                        </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden mb-4">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-left text-gray-600">
                                    <th className="px-3 py-2">Product</th>
                                    <th className="px-3 py-2 w-28 text-right">System Qty</th>
                                    <th className="px-3 py-2 w-28 text-right">Physical Qty</th>
                                    <th className="px-3 py-2 w-28 text-right">Variance</th>
                                    <th className="px-3 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.items.map((item: any, i: number) => {
                                    const diff = (item.physical_quantity || 0) - (item.system_quantity || 0);
                                    return (
                                        <tr key={i}>
                                            <td className="px-3 py-2">
                                                <select className={inputCls} value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                                                    <option value="">— Select Product —</option>
                                                    {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" min={0} className={`${inputCls} text-right`} value={item.system_quantity} onChange={e => updateItem(i, 'system_quantity', +e.target.value)} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" min={0} className={`${inputCls} text-right`} value={item.physical_quantity} onChange={e => updateItem(i, 'physical_quantity', +e.target.value)} />
                                            </td>
                                            <td className={`px-3 py-2 text-right font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                {diff > 0 ? '+' : ''}{diff}
                                            </td>
                                            <td className="px-3 py-2">
                                                <button type="button" onClick={() => setData('items', data.items.filter((_: any, idx: number) => idx !== i))} className="text-red-500 text-lg">×</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <FormField label="Notes">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                        <Link href="/stock-opnames" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

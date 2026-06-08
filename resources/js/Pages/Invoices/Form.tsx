import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import ContractPickerModal from '@/Components/ContractPickerModal';
import ProductPickerModal from '@/Components/ProductPickerModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const emptyItem = () => ({
    product_id:     '',
    description:    '',
    quantity:       1,
    uom:            '',
    uom_conversion: 1,
    unit_price:     '',
    tax_rate:       0,
    tax_amount:     0,
    subtotal:       0,
});

const itemFromSO = (it: any) => ({
    product_id:     it.product_id     ?? '',
    description:    it.product?.name  ?? it.description ?? '',
    quantity:       it.quantity       ?? 1,
    uom:            it.uom            ?? '',
    uom_conversion: it.uom_conversion ?? 1,
    unit_price:     it.unit_price     ?? '',
    tax_rate:       it.tax_rate       ?? 0,
    tax_amount:     it.tax_amount     ?? 0,
    subtotal:       it.subtotal       ?? 0,
});

export default function Form({ invoice, contracts, products, nextNumber }: any) {
    const editing = !!invoice;

    const { data, setData, post, put, processing, errors } = useForm<any>({
        contract_id:    invoice?.contract_id    ?? '',
        customer_id:    invoice?.customer_id    ?? '',
        sales_order_id: invoice?.sales_order_id ?? '',
        invoice_number: invoice?.invoice_number ?? nextNumber ?? '',
        invoice_date:   invoice?.invoice_date   ?? '',
        due_date:       invoice?.due_date        ?? '',
        status:         invoice?.status          ?? 'draft',
        notes:          invoice?.notes           ?? '',
        items: invoice?.items?.map(itemFromSO) ?? [emptyItem()],
    });

    const [contractPickerOpen, setContractPickerOpen] = useState(false);
    const [pickerIdx, setPickerIdx] = useState<number | null>(null);

    const selectedContract = contracts?.find((c: any) => String(c.id) === String(data.contract_id));
    const latestSO         = selectedContract?.sales_orders?.[0];
    const getProduct       = (id: string) => products?.find((p: any) => p.id === id);

    const handleSelectContract = (contract: any) => {
        const so    = contract.sales_orders?.[0];
        const items = so?.items?.length ? so.items.map(itemFromSO) : [emptyItem()];
        setData({
            ...data,
            contract_id:    contract.id,
            customer_id:    contract.customer_id ?? '',
            sales_order_id: so?.id ?? '',
            items,
        });
    };

    const recalc = (item: any) => {
        const sub = (item.quantity || 0) * (item.unit_price || 0);
        return { ...item, subtotal: sub, tax_amount: sub * ((item.tax_rate || 0) / 100) };
    };

    const updateItem = (i: number, field: string, value: any) => {
        const items = [...data.items];
        items[i] = recalc({ ...items[i], [field]: value });
        setData('items', items);
    };

    const handleSelectProduct = (product: any) => {
        if (pickerIdx === null) return;
        const items = [...data.items];
        items[pickerIdx] = recalc({
            ...items[pickerIdx],
            product_id:  product.id,
            description: product.name,
            uom:         items[pickerIdx].uom || product.unit || '',
            unit_price:  items[pickerIdx].unit_price || product.sales_price || '',
        });
        setData('items', items);
    };

    const addItem    = () => setData('items', [...data.items, emptyItem()]);
    const removeItem = (i: number) =>
        setData('items', data.items.filter((_: any, idx: number) => idx !== i));

    const subtotalAll = data.items.reduce((s: number, it: any) => s + (it.subtotal   || 0), 0);
    const taxAll      = data.items.reduce((s: number, it: any) => s + (it.tax_amount || 0), 0);
    const grandTotal  = subtotalAll + taxAll;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/invoices/${invoice.id}`) : post('/invoices');
    };

    return (
        <AppLayout header={editing ? 'Edit Invoice' : 'Create Invoice'}>
            <Head title="Invoice" />

            {contractPickerOpen && (
                <ContractPickerModal
                    contracts={contracts ?? []}
                    onSelect={handleSelectContract}
                    onClose={() => setContractPickerOpen(false)}
                />
            )}

            {pickerIdx !== null && (
                <ProductPickerModal
                    products={products ?? []}
                    onSelect={handleSelectProduct}
                    onClose={() => setPickerIdx(null)}
                    extraLabel="Sales Price"
                    extraKey="sales_price"
                    extraFormat="currency"
                />
            )}

            <div className="max-w-5xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    <div className="grid grid-cols-4 gap-4">
                        <FormField label="Invoice No." error={errors.invoice_number} required>
                            <input className={inputCls + ' bg-gray-50'} value={data.invoice_number} readOnly tabIndex={-1} />
                        </FormField>
                        <FormField label="Invoice Date" error={errors.invoice_date} required>
                            <input type="date" className={inputCls} value={data.invoice_date}
                                onChange={e => setData('invoice_date', e.target.value)} />
                        </FormField>
                        <FormField label="Due Date" error={errors.due_date} required>
                            <input type="date" className={inputCls} value={data.due_date}
                                onChange={e => setData('due_date', e.target.value)} />
                        </FormField>
                        <FormField label="Status">
                            <select className={inputCls} value={data.status}
                                onChange={e => setData('status', e.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </FormField>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <FormField label="Contract Ref.">
                            <button
                                type="button"
                                onClick={() => setContractPickerOpen(true)}
                                className="w-full text-left px-3 py-2 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                            >
                                {selectedContract
                                    ? <span className="text-gray-800">{selectedContract.contract_number}</span>
                                    : <span className="text-gray-400">— Select Contract —</span>
                                }
                            </button>
                        </FormField>
                        <FormField label="Customer">
                            <div className={`${inputCls} bg-gray-50 cursor-default`}>
                                {selectedContract?.customer?.name
                                    ? <span className="text-gray-700">{selectedContract.customer.name}</span>
                                    : <span className="text-gray-400 italic text-xs">Automatic from contract</span>
                                }
                            </div>
                        </FormField>
                        <FormField label="Sales Order No.">
                            <div className={`${inputCls} bg-gray-50 cursor-default font-mono text-xs`}>
                                {latestSO?.so_number
                                    ? <span className="text-gray-700">{latestSO.so_number}</span>
                                    : <span className="text-gray-400 italic">Automatic from contract</span>
                                }
                            </div>
                        </FormField>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Invoice Items</h3>
                        <div className="border rounded-lg overflow-x-auto mb-2">
                            <table className="w-full text-sm min-w-[900px]">
                                <thead className="bg-gray-50 border-b">
                                    <tr className="text-left text-gray-600 text-xs">
                                        <th className="px-3 py-2">Product</th>
                                        <th className="px-3 py-2 w-20">Qty</th>
                                        <th className="px-3 py-2 w-24">Unit</th>
                                        <th className="px-3 py-2 w-20 text-center" title="Conversion to base unit">Conversion</th>
                                        <th className="px-3 py-2 w-36">Unit Price</th>
                                        <th className="px-3 py-2 w-20 text-center">Tax %</th>
                                        <th className="px-3 py-2 w-36 text-right">Subtotal</th>
                                        <th className="px-3 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.items.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-3 py-4 text-center text-gray-400 text-sm">
                                                Select a contract to autofill items, or add manually.
                                            </td>
                                        </tr>
                                    )}
                                    {data.items.map((item: any, i: number) => {
                                        const selected = getProduct(item.product_id);
                                        const displayName = selected?.name ?? item.description;
                                        return (
                                            <tr key={i} className="align-middle">
                                                <td className="px-3 py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPickerIdx(i)}
                                                        className="w-full text-left px-3 py-1.5 border rounded-md text-sm bg-white hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                                                    >
                                                        {displayName
                                                            ? <span className="text-gray-800">{displayName}</span>
                                                            : <span className="text-gray-400">— Select Product —</span>
                                                        }
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min={1} className={inputCls}
                                                        value={item.quantity}
                                                        onChange={e => updateItem(i, 'quantity', +e.target.value)} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input className={inputCls} value={item.uom}
                                                        onChange={e => updateItem(i, 'uom', e.target.value)}
                                                        placeholder={selected?.unit ?? 'Unit'} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min={1} step="any" className={inputCls}
                                                        value={item.uom_conversion}
                                                        onChange={e => updateItem(i, 'uom_conversion', +e.target.value)}
                                                        title="Base units per 1 of this unit" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min={0} className={inputCls}
                                                        value={item.unit_price}
                                                        onChange={e => updateItem(i, 'unit_price', +e.target.value)}
                                                        placeholder="0" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" min={0} max={100} step="0.1" className={inputCls}
                                                        value={item.tax_rate}
                                                        onChange={e => updateItem(i, 'tax_rate', +e.target.value)}
                                                        placeholder="0" />
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                                                    {fmt(item.subtotal || 0)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <button type="button" onClick={() => removeItem(i)}
                                                        className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t text-sm">
                                    <tr>
                                        <td colSpan={6} className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                                        <td className="px-3 py-2 text-right font-bold text-emerald-700 whitespace-nowrap">{fmt(grandTotal)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <button type="button" onClick={addItem}
                            className="text-sm text-red-600 hover:underline">
                            + Add Item
                        </button>
                    </div>

                    <FormField label="Notes">
                        <textarea rows={2} className={inputCls} value={data.notes}
                            onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing}
                            className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                        <Link href="/invoices"
                            className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

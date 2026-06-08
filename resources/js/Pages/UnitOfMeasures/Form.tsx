import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ uom, allUoms }: any) {
    const editing = !!uom;
    const { data, setData, post, put, processing, errors } = useForm({
        name:              uom?.name              ?? '',
        symbol:            uom?.symbol            ?? '',
        base_uom_id:       uom?.base_uom_id       ?? '',
        conversion_factor: uom?.conversion_factor ?? '',
        status:            uom?.status            ?? 'active',
    });

    const isBaseUnit = !data.base_uom_id;
    const selectedBase = allUoms?.find((u: any) => u.id === data.base_uom_id);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/unit-of-measures/${uom.id}`) : post('/unit-of-measures');
    };

    return (
        <AppLayout header={editing ? 'Edit Unit' : 'Add Unit'}>
            <Head title={editing ? 'Edit Unit' : 'Add Unit'} />
            <div className="max-w-lg bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Unit Name" error={errors.name} required>
                            <input
                                className={inputCls}
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="e.g. Kilogram, Pieces"
                            />
                        </FormField>
                        <FormField label="Symbol" error={errors.symbol} required>
                            <input
                                className={inputCls}
                                value={data.symbol}
                                onChange={e => setData('symbol', e.target.value)}
                                placeholder="e.g. kg, pcs"
                            />
                        </FormField>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-700">Conversion to Base Unit</p>
                        <FormField label="Base Unit" error={errors.base_uom_id}>
                            <select
                                className={inputCls}
                                value={data.base_uom_id}
                                onChange={e => {
                                    setData('base_uom_id', e.target.value);
                                    if (!e.target.value) setData('conversion_factor', '');
                                }}
                            >
                                <option value="">— This is the base unit —</option>
                                {allUoms?.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                                ))}
                            </select>
                        </FormField>

                        {!isBaseUnit && (
                            <FormField label={`Conversion Factor (1 ${data.symbol || '…'} = ? ${selectedBase?.symbol ?? '…'})`} error={errors.conversion_factor} required>
                                <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    className={inputCls}
                                    value={data.conversion_factor}
                                    onChange={e => setData('conversion_factor', e.target.value)}
                                    placeholder="e.g. 1000"
                                />
                            </FormField>
                        )}

                        {!isBaseUnit && data.conversion_factor && selectedBase && (
                            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                                <span className="font-semibold">Preview:</span>{' '}
                                1 <strong>{data.name || data.symbol}</strong> = {Number(data.conversion_factor).toLocaleString('en-US')} <strong>{selectedBase.name} ({selectedBase.symbol})</strong>
                            </div>
                        )}

                        {isBaseUnit && (
                            <p className="text-xs text-gray-400">This is a base unit. No conversion factor required.</p>
                        )}
                    </div>

                    <FormField label="Status">
                        <label className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                checked={data.status === 'active'}
                                onChange={e => setData('status', e.target.checked ? 'active' : 'inactive')}
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700">Active</span>
                        </label>
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                        >
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                        <Link
                            href="/unit-of-measures"
                            className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

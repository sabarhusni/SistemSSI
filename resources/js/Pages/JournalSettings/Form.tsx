import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

const ACCOUNT_TYPES = [
    { value: 'asset',     label: 'Asset' },
    { value: 'liability', label: 'Liability' },
    { value: 'equity',    label: 'Equity' },
    { value: 'revenue',   label: 'Revenue' },
    { value: 'expense',   label: 'Expense' },
    { value: 'cogs',   label: 'COGS' },
];

const ACCOUNT_CATEGORIES = [
    { value: 'current', label: 'Current' },
    { value: 'fixed',   label: 'Fixed' },
];

export default function Form({ journalSetting }: any) {
    const editing = !!journalSetting;

    const { data, setData, post, put, processing, errors } = useForm<any>({
        account_code:     journalSetting?.account_code     ?? '',
        account_name:     journalSetting?.account_name     ?? '',
        account_type:     journalSetting?.account_type     ?? 'asset',
        account_category: journalSetting?.account_category ?? '',
        description:      journalSetting?.description      ?? '',
        is_active:        journalSetting?.is_active        ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/journal-settings/${journalSetting.id}`) : post('/journal-settings');
    };

    const showCategory = data.account_type === 'asset' || data.account_type === 'liability';

    return (
        <AppLayout header={editing ? 'Edit Journal Account' : 'Add Journal Account'}>
            <Head title={editing ? 'Edit Journal Account' : 'Add Journal Account'} />

            <div className="max-w-xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Account Code" error={errors.account_code} required>
                            <input
                                className={inputCls + ' font-mono'}
                                value={data.account_code}
                                onChange={e => setData('account_code', e.target.value)}
                                placeholder="e.g. 1100"
                                maxLength={20}
                            />
                            <p className="text-xs text-gray-400 mt-1">Unique account number (chart of accounts)</p>
                        </FormField>

                        <FormField label="Account Type" error={errors.account_type} required>
                            <select
                                className={inputCls}
                                value={data.account_type}
                                onChange={e => {
                                    setData('account_type', e.target.value);
                                    if (e.target.value !== 'asset' && e.target.value !== 'liability') {
                                        setData('account_category', '');
                                    }
                                }}
                            >
                                {ACCOUNT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <FormField label="Account Name" error={errors.account_name} required>
                        <input
                            className={inputCls}
                            value={data.account_name}
                            onChange={e => setData('account_name', e.target.value)}
                            placeholder="e.g. Inventory, Accounts Payable"
                        />
                    </FormField>

                    {showCategory && (
                        <FormField label="Account Category" error={errors.account_category}>
                            <select
                                className={inputCls}
                                value={data.account_category}
                                onChange={e => setData('account_category', e.target.value)}
                            >
                                <option value="">— None —</option>
                                {ACCOUNT_CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </FormField>
                    )}

                    <FormField label="Description" error={errors.description}>
                        <textarea
                            rows={3}
                            className={inputCls}
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                            placeholder="Account description (optional)"
                        />
                    </FormField>

                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={e => setData('is_active', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Active Account</span>
                        </label>
                        <span className="text-xs text-gray-400">Inactive accounts cannot be selected on new transactions</span>
                    </div>

                    <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 space-y-1">
                        <p className="font-semibold">Account Code Guide:</p>
                        <p>1xxx = Asset &nbsp;|&nbsp; 2xxx = Liability &nbsp;|&nbsp; 3xxx = Equity</p>
                        <p>4xxx = Revenue &nbsp;|&nbsp; 5xxx = Expense</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                        >
                            {processing ? 'Saving...' : 'Save'}
                        </button>
                        <Link
                            href="/journal-settings"
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

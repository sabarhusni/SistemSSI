import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

const ACCOUNT_TYPES = [
    { value: 'asset',     label: 'Asset (Aktiva)' },
    { value: 'liability', label: 'Liability (Kewajiban)' },
    { value: 'equity',    label: 'Equity (Modal)' },
    { value: 'revenue',   label: 'Revenue (Pendapatan)' },
    { value: 'expense',   label: 'Expense (Biaya)' },
];

const ACCOUNT_CATEGORIES = [
    { value: 'current', label: 'Current (Lancar)' },
    { value: 'fixed',   label: 'Fixed (Tetap)' },
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
        <AppLayout header={editing ? 'Edit Akun Jurnal' : 'Tambah Akun Jurnal'}>
            <Head title={editing ? 'Edit Akun Jurnal' : 'Tambah Akun Jurnal'} />

            <div className="max-w-xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Kode Akun" error={errors.account_code} required>
                            <input
                                className={inputCls + ' font-mono'}
                                value={data.account_code}
                                onChange={e => setData('account_code', e.target.value)}
                                placeholder="cth: 1100"
                                maxLength={20}
                            />
                            <p className="text-xs text-gray-400 mt-1">Kode unik akun (nomor chart of accounts)</p>
                        </FormField>

                        <FormField label="Tipe Akun" error={errors.account_type} required>
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

                    <FormField label="Nama Akun" error={errors.account_name} required>
                        <input
                            className={inputCls}
                            value={data.account_name}
                            onChange={e => setData('account_name', e.target.value)}
                            placeholder="cth: Persediaan Barang, Hutang Usaha"
                        />
                    </FormField>

                    {showCategory && (
                        <FormField label="Kategori Akun" error={errors.account_category}>
                            <select
                                className={inputCls}
                                value={data.account_category}
                                onChange={e => setData('account_category', e.target.value)}
                            >
                                <option value="">— Tidak Ada —</option>
                                {ACCOUNT_CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </FormField>
                    )}

                    <FormField label="Deskripsi" error={errors.description}>
                        <textarea
                            rows={3}
                            className={inputCls}
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                            placeholder="Keterangan akun (opsional)"
                        />
                    </FormField>

                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={e => setData('is_active', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Akun Aktif</span>
                        </label>
                        <span className="text-xs text-gray-400">Akun nonaktif tidak dapat dipilih pada transaksi baru</span>
                    </div>

                    <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 space-y-1">
                        <p className="font-semibold">Panduan Kode Akun:</p>
                        <p>1xxx = Asset &nbsp;|&nbsp; 2xxx = Liability &nbsp;|&nbsp; 3xxx = Equity</p>
                        <p>4xxx = Revenue &nbsp;|&nbsp; 5xxx = Expense</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link
                            href="/journal-settings"
                            className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Batal
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

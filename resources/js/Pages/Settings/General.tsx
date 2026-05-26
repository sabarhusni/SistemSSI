import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

export default function General({ settings, journalAccounts }: any) {
    const { flash } = usePage().props as any;

    const { data, setData, post, processing, errors } = useForm({
        tax_type:                  settings?.tax_type                  ?? 'exclude',
        tax_rate_po:               settings?.tax_rate_po               ?? '11',
        tax_rate_so:               settings?.tax_rate_so               ?? '11',
        company_name:              settings?.company_name              ?? '',
        journal_account_inventory: settings?.journal_account_inventory ?? '',
        journal_account_ap:        settings?.journal_account_ap        ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/settings/general');
    };

    const assetAccounts  = journalAccounts?.filter((a: any) => a.account_type === 'asset')     ?? [];
    const liabAccounts   = journalAccounts?.filter((a: any) => a.account_type === 'liability') ?? [];

    return (
        <AppLayout header="Pengaturan Umum">
            <Head title="Pengaturan Umum" />
            <div className="max-w-2xl space-y-6">

                {flash?.success && (
                    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                        {flash.success}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-6">

                    {/* Perusahaan */}
                    <div className="bg-white rounded-xl shadow p-6 space-y-5">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Informasi Perusahaan</h2>

                        <FormField label="Nama Perusahaan" error={errors.company_name}>
                            <input className={inputCls} value={data.company_name} onChange={e => setData('company_name', e.target.value)} placeholder="PT. ..." />
                        </FormField>
                    </div>

                    {/* Pajak */}
                    <div className="bg-white rounded-xl shadow p-6 space-y-5">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Konfigurasi Pajak</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipe Pajak PPH <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tax_type"
                                        value="exclude"
                                        checked={data.tax_type === 'exclude'}
                                        onChange={() => setData('tax_type', 'exclude')}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Tax Exclude</span>
                                    <span className="text-xs text-gray-400">(PPH ditambahkan di luar harga)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tax_type"
                                        value="include"
                                        checked={data.tax_type === 'include'}
                                        onChange={() => setData('tax_type', 'include')}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Tax Include</span>
                                    <span className="text-xs text-gray-400">(PPH sudah termasuk dalam harga)</span>
                                </label>
                            </div>
                            {errors.tax_type && <p className="mt-1 text-xs text-red-500">{errors.tax_type}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="PPH Default Pembelian (%)" error={errors.tax_rate_po}>
                                <input
                                    type="number" min={0} max={100} step="0.01"
                                    className={inputCls}
                                    value={data.tax_rate_po}
                                    onChange={e => setData('tax_rate_po', e.target.value)}
                                />
                            </FormField>
                            <FormField label="PPH Default Penjualan (%)" error={errors.tax_rate_so}>
                                <input
                                    type="number" min={0} max={100} step="0.01"
                                    className={inputCls}
                                    value={data.tax_rate_so}
                                    onChange={e => setData('tax_rate_so', e.target.value)}
                                />
                            </FormField>
                        </div>

                        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                            <strong>Tax Exclude:</strong> Subtotal = Qty × Harga Satuan, kemudian ditambah PPH.<br />
                            <strong>Tax Include:</strong> Subtotal = Qty × Harga Satuan (PPH sudah termasuk, hanya informatif).
                        </div>
                    </div>

                    {/* Akun Jurnal Transaksi */}
                    <div className="bg-white rounded-xl shadow p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Konfigurasi Akun Jurnal Pembelian</h2>
                            <Link href="/journal-settings" className="text-xs text-emerald-600 hover:underline">
                                Kelola Akun Jurnal →
                            </Link>
                        </div>

                        <p className="text-sm text-gray-500">
                            Pilih akun yang digunakan saat proses penerimaan barang (Receive Item) dari Purchase Order.
                        </p>

                        {journalAccounts?.length === 0 ? (
                            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                                Belum ada akun jurnal aktif. Tambahkan akun terlebih dahulu di{' '}
                                <Link href="/journal-settings/create" className="font-semibold underline">Akun Jurnal</Link>.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <FormField label="Akun Persediaan / Inventory (Debit)" error={errors.journal_account_inventory}>
                                    <select
                                        className={inputCls}
                                        value={data.journal_account_inventory}
                                        onChange={e => setData('journal_account_inventory', e.target.value)}
                                    >
                                        <option value="">— Pilih Akun Asset —</option>
                                        {assetAccounts.map((a: any) => (
                                            <option key={a.id} value={a.account_code}>
                                                {a.account_code} — {a.account_name}
                                            </option>
                                        ))}
                                        {assetAccounts.length === 0 && (
                                            <option disabled>Tidak ada akun Asset aktif</option>
                                        )}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">Debit saat menerima barang (nilai persediaan bertambah)</p>
                                </FormField>

                                <FormField label="Akun Hutang Usaha / Accounts Payable (Kredit)" error={errors.journal_account_ap}>
                                    <select
                                        className={inputCls}
                                        value={data.journal_account_ap}
                                        onChange={e => setData('journal_account_ap', e.target.value)}
                                    >
                                        <option value="">— Pilih Akun Liability —</option>
                                        {liabAccounts.map((a: any) => (
                                            <option key={a.id} value={a.account_code}>
                                                {a.account_code} — {a.account_name}
                                            </option>
                                        ))}
                                        {liabAccounts.length === 0 && (
                                            <option disabled>Tidak ada akun Liability aktif</option>
                                        )}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">Kredit saat menerima barang (hutang ke supplier bertambah)</p>
                                </FormField>
                            </div>
                        )}

                        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
                            <p className="font-semibold mb-1">Jurnal saat Receive Item:</p>
                            <p>Debit: Persediaan Barang &nbsp;|&nbsp; Kredit: Hutang Usaha</p>
                            <p className="text-xs text-gray-400 mt-1">Nilai = Qty Diterima × HPP rata-rata (average cost method)</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

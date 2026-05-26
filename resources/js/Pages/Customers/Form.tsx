import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ customer, nextCode }: any) {
    const editing = !!customer;
    const { data, setData, post, put, processing, errors } = useForm({
        code:            customer?.code            ?? nextCode ?? '',
        name:            customer?.name            ?? '',
        company_name:    customer?.company_name    ?? '',
        email:           customer?.email           ?? '',
        phone:           customer?.phone           ?? '',
        address:         customer?.address         ?? '',
        city:            customer?.city            ?? '',
        province:        customer?.province        ?? '',
        postal_code:     customer?.postal_code     ?? '',
        notes:           customer?.notes           ?? '',
        status:          customer?.status          ?? 'active',
        payment_method:  customer?.payment_method  ?? '',
        payment_terms:   customer?.payment_terms   ?? '',
        npwp:            customer?.npwp            ?? '',
        jabatan_kontak:  customer?.jabatan_kontak  ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/customers/${customer.id}`) : post('/customers');
    };

    return (
        <AppLayout header={editing ? 'Edit Customer' : 'Tambah Customer'}>
            <Head title={editing ? 'Edit Customer' : 'Tambah Customer'} />
            <div className="max-w-2xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Kode" error={errors.code} required>
                            <input
                                className={inputCls + ' bg-gray-50'}
                                value={data.code}
                                readOnly
                                tabIndex={-1}
                            />
                        </FormField>
                        <FormField label="Status">
                            <label className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    checked={data.status === 'active'}
                                    onChange={e => setData('status', e.target.checked ? 'active' : 'inactive')}
                                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-700">Aktif</span>
                            </label>
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Nama Kontak" error={errors.name} required>
                            <input className={inputCls} value={data.name} onChange={e => setData('name', e.target.value)} />
                        </FormField>
                        <FormField label="Jabatan Kontak" error={errors.jabatan_kontak}>
                            <input className={inputCls} value={data.jabatan_kontak} onChange={e => setData('jabatan_kontak', e.target.value)} placeholder="Direktur, Manager, ..." />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Nama Perusahaan" error={errors.company_name}>
                            <input className={inputCls} value={data.company_name} onChange={e => setData('company_name', e.target.value)} placeholder="PT / CV / UD ..." />
                        </FormField>
                        <FormField label="NPWP" error={errors.npwp}>
                            <input className={inputCls} value={data.npwp} onChange={e => setData('npwp', e.target.value)} placeholder="XX.XXX.XXX.X-XXX.XXX" />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Email" error={errors.email}>
                            <input type="email" className={inputCls} value={data.email} onChange={e => setData('email', e.target.value)} />
                        </FormField>
                        <FormField label="Telepon" error={errors.phone}>
                            <input className={inputCls} value={data.phone} onChange={e => setData('phone', e.target.value)} />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Payment Method" error={errors.payment_method}>
                            <select className={inputCls} value={data.payment_method} onChange={e => setData('payment_method', e.target.value)}>
                                <option value="">— Pilih —</option>
                                <option value="Transfer Bank">Transfer Bank</option>
                                <option value="Tunai">Tunai</option>
                                <option value="Giro">Giro</option>
                                <option value="Cek">Cek</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </FormField>
                        <FormField label="Payment Terms" error={errors.payment_terms}>
                            <select className={inputCls} value={data.payment_terms} onChange={e => setData('payment_terms', e.target.value)}>
                                <option value="">— Pilih —</option>
                                <option value="COD">COD (Cash on Delivery)</option>
                                <option value="NET7">NET 7</option>
                                <option value="NET14">NET 14</option>
                                <option value="NET30">NET 30</option>
                                <option value="NET45">NET 45</option>
                                <option value="NET60">NET 60</option>
                            </select>
                        </FormField>
                    </div>

                    <FormField label="Alamat" error={errors.address}>
                        <textarea rows={2} className={inputCls} value={data.address} onChange={e => setData('address', e.target.value)} />
                    </FormField>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField label="Kota" error={errors.city}>
                            <input className={inputCls} value={data.city} onChange={e => setData('city', e.target.value)} />
                        </FormField>
                        <FormField label="Provinsi" error={errors.province}>
                            <input className={inputCls} value={data.province} onChange={e => setData('province', e.target.value)} />
                        </FormField>
                        <FormField label="Kode Pos" error={errors.postal_code}>
                            <input className={inputCls} value={data.postal_code} onChange={e => setData('postal_code', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Catatan">
                        <textarea rows={2} className={inputCls} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/customers" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

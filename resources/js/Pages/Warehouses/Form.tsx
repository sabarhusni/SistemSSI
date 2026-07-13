import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ warehouse }: any) {
    const editing = !!warehouse;
    const { data, setData, post, put, processing, errors } = useForm({
        code:    warehouse?.code    ?? '',
        type:    warehouse?.type    ?? 'pusat',
        name:    warehouse?.name    ?? '',
        address: warehouse?.address ?? '',
        phone:   warehouse?.phone   ?? '',
        status:  warehouse?.status  ?? 'active',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/warehouses/${warehouse.id}`) : post('/warehouses');
    };

    return (
        <AppLayout header={editing ? 'Edit Gudang' : 'Tambah Gudang'}>
            <Head title={editing ? 'Edit Gudang' : 'Tambah Gudang'} />
            <div className="max-w-xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Kode Gudang" error={errors.code} required>
                            <input
                                className={inputCls}
                                value={data.code}
                                onChange={e => setData('code', e.target.value.toUpperCase())}
                                placeholder="Contoh: GDG-001"
                                maxLength={20}
                            />
                        </FormField>
                        <FormField label="Tipe Gudang" error={(errors as any).type} required>
                            <select
                                className={inputCls}
                                value={data.type}
                                onChange={e => setData('type', e.target.value)}
                            >
                                <option value="pusat">Gudang Pusat</option>
                                <option value="cabang">Gudang Cabang</option>
                            </select>
                        </FormField>
                    </div>

                    <FormField label="Nama Gudang" error={errors.name} required>
                        <input
                            className={inputCls}
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            placeholder="Contoh: Gudang Utama Jakarta"
                        />
                    </FormField>

                    <FormField label="Alamat" error={errors.address}>
                        <textarea
                            rows={3}
                            className={inputCls}
                            value={data.address}
                            onChange={e => setData('address', e.target.value)}
                            placeholder="Alamat lengkap gudang"
                        />
                    </FormField>

                    <FormField label="Telepon" error={errors.phone}>
                        <input
                            className={inputCls}
                            value={data.phone}
                            onChange={e => setData('phone', e.target.value)}
                            placeholder="Contoh: 021-12345678"
                            maxLength={30}
                        />
                    </FormField>

                    <FormField label="Status">
                        <label className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                checked={data.status === 'active'}
                                onChange={e => setData('status', e.target.checked ? 'active' : 'inactive')}
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700">Aktif</span>
                        </label>
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link
                            href="/warehouses"
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

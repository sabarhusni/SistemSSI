import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ user, roles }: any) {
    const editing = !!user;
    const { data, setData, post, put, processing, errors } = useForm<any>({
        name:                  user?.name     ?? '',
        username:              user?.username  ?? '',
        email:                 user?.email     ?? '',
        role_id:               user?.role_id   ?? '',
        status:                user?.status    ?? 'active',
        password:              '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/users/${user.id}`) : post('/users');
    };

    return (
        <AppLayout header={editing ? 'Edit Pengguna' : 'Tambah Pengguna'}>
            <Head title="Pengguna" />
            <div className="max-w-2xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Nama Lengkap" error={errors.name} required>
                        <input className={inputCls} value={data.name} onChange={e => setData('name', e.target.value)} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Username" error={errors.username} required>
                            <input className={inputCls} value={data.username} onChange={e => setData('username', e.target.value)} autoComplete="off" />
                        </FormField>
                        <FormField label="Email" error={errors.email} required>
                            <input type="email" className={inputCls} value={data.email} onChange={e => setData('email', e.target.value)} />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Role">
                            <select className={inputCls} value={data.role_id} onChange={e => setData('role_id', e.target.value)}>
                                <option value="">— Tanpa Role —</option>
                                {roles?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
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

                    <hr className="border-gray-100" />
                    <p className="text-xs text-gray-500">{editing ? 'Kosongkan password jika tidak ingin mengubah.' : 'Wajib diisi untuk pengguna baru.'}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label={editing ? 'Password Baru' : 'Password'} error={errors.password} required={!editing}>
                            <input type="password" className={inputCls} value={data.password} onChange={e => setData('password', e.target.value)} autoComplete="new-password" />
                        </FormField>
                        <FormField label="Konfirmasi Password" error={errors.password_confirmation} required={!editing}>
                            <input type="password" className={inputCls} value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} autoComplete="new-password" />
                        </FormField>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/users" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

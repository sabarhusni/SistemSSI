import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ role, permissions }: any) {
    const editing = !!role;
    const { data, setData, post, put, processing, errors } = useForm<any>({
        name:        role?.name        ?? '',
        description: role?.description ?? '',
        permissions: role?.permissions?.map((p: any) => p.id) ?? [],
    });

    const togglePermission = (id: string) => {
        const perms: string[] = data.permissions;
        setData('permissions', perms.includes(id) ? perms.filter(p => p !== id) : [...perms, id]);
    };

    const toggleGroup = (groupPerms: any[]) => {
        const ids = groupPerms.map(p => p.id);
        const allChecked = ids.every(id => data.permissions.includes(id));
        if (allChecked) {
            setData('permissions', data.permissions.filter((p: string) => !ids.includes(p)));
        } else {
            const merged = [...new Set([...data.permissions, ...ids])];
            setData('permissions', merged);
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/roles/${role.id}`) : post('/roles');
    };

    // Group permissions by module (prefix before first dot or dash)
    const grouped: Record<string, any[]> = {};
    permissions?.forEach((perm: any) => {
        const group = perm.name.split('.')[0].split('-')[0];
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(perm);
    });

    return (
        <AppLayout header={editing ? 'Edit Role' : 'Tambah Role'}>
            <Head title="Role" />
            <div className="max-w-3xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Nama Role" error={errors.name} required>
                            <input className={inputCls} value={data.name} onChange={e => setData('name', e.target.value)} />
                        </FormField>
                        <FormField label="Deskripsi">
                            <input className={inputCls} value={data.description} onChange={e => setData('description', e.target.value)} />
                        </FormField>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-700 mb-3">Permissions</h3>
                        <div className="space-y-4">
                            {Object.entries(grouped).map(([group, perms]) => {
                                const allChecked = perms.every(p => data.permissions.includes(p.id));
                                const someChecked = perms.some(p => data.permissions.includes(p.id));
                                return (
                                    <div key={group} className="border rounded-lg p-3">
                                        <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={allChecked}
                                                ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                                onChange={() => toggleGroup(perms)}
                                                className="w-4 h-4 text-emerald-600 rounded"
                                            />
                                            <span className="font-medium text-gray-700 capitalize">{group}</span>
                                            <span className="text-xs text-gray-400">({perms.length} permission)</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6">
                                            {perms.map(perm => (
                                                <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer text-gray-600 hover:text-gray-800">
                                                    <input
                                                        type="checkbox"
                                                        checked={data.permissions.includes(perm.id)}
                                                        onChange={() => togglePermission(perm.id)}
                                                        className="w-3.5 h-3.5 text-emerald-600 rounded"
                                                    />
                                                    {perm.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link href="/roles" className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Batal</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

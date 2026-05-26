import AppLayout from '@/Layouts/AppLayout';
import FormField, { inputCls } from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Form({ employee, nextNumber }: any) {
    const editing = !!employee;
    const { data, setData, post, put, processing, errors } = useForm({
        employee_number: employee?.employee_number ?? nextNumber ?? '',
        name:            employee?.name            ?? '',
        position:        employee?.position        ?? '',
        department:      employee?.department      ?? '',
        phone:           employee?.phone           ?? '',
        email:           employee?.email           ?? '',
        join_date:       employee?.join_date       ?? '',
        status:          employee?.status          ?? 'active',
        notes:           employee?.notes           ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        editing ? put(`/employees/${employee.id}`) : post('/employees');
    };

    return (
        <AppLayout header={editing ? 'Edit Karyawan' : 'Tambah Karyawan'}>
            <Head title={editing ? 'Edit Karyawan' : 'Tambah Karyawan'} />
            <div className="max-w-2xl bg-white rounded-xl shadow p-6">
                <form onSubmit={submit} className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="No. Karyawan" error={errors.employee_number} required>
                            <input
                                className={inputCls + ' bg-gray-50'}
                                value={data.employee_number}
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

                    <FormField label="Nama Lengkap" error={errors.name} required>
                        <input
                            className={inputCls}
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                        />
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Jabatan" error={errors.position}>
                            <input
                                className={inputCls}
                                value={data.position}
                                onChange={e => setData('position', e.target.value)}
                                placeholder="cth: Sales Manager"
                            />
                        </FormField>
                        <FormField label="Divisi / Departemen" error={errors.department}>
                            <input
                                className={inputCls}
                                value={data.department}
                                onChange={e => setData('department', e.target.value)}
                                placeholder="cth: Marketing"
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Telepon" error={errors.phone}>
                            <input
                                className={inputCls}
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                placeholder="08xxxxxxxxxx"
                            />
                        </FormField>
                        <FormField label="Email" error={errors.email}>
                            <input
                                type="email"
                                className={inputCls}
                                value={data.email}
                                onChange={e => setData('email', e.target.value)}
                            />
                        </FormField>
                    </div>

                    <FormField label="Tanggal Bergabung" error={errors.join_date}>
                        <input
                            type="date"
                            className={inputCls}
                            value={data.join_date}
                            onChange={e => setData('join_date', e.target.value)}
                        />
                    </FormField>

                    <FormField label="Catatan">
                        <textarea
                            rows={3}
                            className={inputCls}
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                        />
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <Link
                            href="/employees"
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

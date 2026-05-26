import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    const inputCls =
        'w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm ' +
        'focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition';

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Head title="Login" />

            {/* Left panel — branding */}
            <div className="hidden lg:flex w-2/5 flex-col bg-slate-800 text-white px-12 py-16">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-auto">
                    <span className="text-3xl">🌿</span>
                    <span className="text-2xl font-bold tracking-wide text-emerald-400">SSI</span>
                </div>

                {/* Tagline */}
                <div className="mb-auto">
                    <h1 className="text-3xl font-bold leading-snug mb-3">
                        Selamat Datang<br />di Sistem ERP
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Kelola operasional, kontrak, penjualan, dan keuangan bisnis Anda
                        dalam satu platform terintegrasi.
                    </p>

                    {/* Feature bullets */}
                    <ul className="mt-8 space-y-3 text-sm text-slate-300">
                        {[
                            { icon: '📋', text: 'Manajemen Kontrak & Sales Order' },
                            { icon: '🔧', text: 'Work Order & Teknisi' },
                            { icon: '🧾', text: 'Invoice & Pembayaran' },
                            { icon: '📦', text: 'Inventori & Stok' },
                        ].map(({ icon, text }) => (
                            <li key={text} className="flex items-center gap-3">
                                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 text-base flex-shrink-0">
                                    {icon}
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-xs text-slate-500 mt-auto">
                    &copy; {new Date().getFullYear()} SSI ERP. All rights reserved.
                </p>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
                        <span className="text-2xl">🌿</span>
                        <span className="text-xl font-bold text-emerald-600 tracking-wide">SSI</span>
                    </div>

                    <div className="bg-white rounded-xl shadow p-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-1">Masuk ke Akun</h2>
                        <p className="text-sm text-gray-500 mb-6">Silakan masukkan username dan password Anda.</p>

                        {status && (
                            <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    autoComplete="username"
                                    autoFocus
                                    className={inputCls}
                                    value={data.username}
                                    onChange={e => setData('username', e.target.value)}
                                />
                                <InputError message={errors.username} className="mt-1" />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    className={inputCls}
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                />
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={data.remember}
                                        onChange={e => setData('remember', e.target.checked as false)}
                                    />
                                    <span className="text-sm text-gray-600">Ingat saya</span>
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-sm text-emerald-600 hover:underline"
                                    >
                                        Lupa password?
                                    </Link>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-2.5 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
                            >
                                {processing ? 'Memproses...' : 'Masuk'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

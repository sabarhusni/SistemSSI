import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';
import { PageProps } from '@/types';

export default function AppLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, navGroups } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const currentPath = window.location.pathname;

    const isActive = (href: string) =>
        currentPath === href || currentPath.startsWith(href + '/');

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`${
                    sidebarOpen ? 'w-60' : 'w-16'
                } flex flex-col bg-slate-800 text-white transition-all duration-200 flex-shrink-0`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
                    <img
                        src="/images/logo_ssi_new.png"
                        alt="SSI"
                        className="h-8 w-8 flex-shrink-0 object-contain"
                    />
                    {sidebarOpen && (
                        <span className="text-lg font-bold tracking-wide text-red-500">SSI</span>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="ml-auto text-slate-400 hover:text-white"
                        title="Toggle sidebar"
                    >
                        {sidebarOpen ? '◀' : '▶'}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-3 space-y-1">
                    {navGroups.map((group) => (
                        <div key={group.label}>
                            {sidebarOpen && (
                                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {group.label}
                                </p>
                            )}
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                        isActive(item.href)
                                            ? 'bg-red-600 text-white'
                                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                                    title={!sidebarOpen ? item.label : undefined}
                                >
                                    <span className="text-base flex-shrink-0">{item.icon}</span>
                                    {sidebarOpen && <span>{item.label}</span>}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* User info */}
                {sidebarOpen && auth?.user && (
                    <div className="border-t border-slate-700 p-4 text-xs text-slate-400">
                        <p className="font-semibold text-white truncate">{auth.user.name}</p>
                        <p className="truncate">{auth.user.email}</p>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="mt-2 text-red-400 hover:text-red-300"
                        >
                            Logout
                        </Link>
                    </div>
                )}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="bg-white shadow-sm flex items-center gap-4 px-6 py-3">
                    {header && (
                        <h1 className="text-lg font-semibold text-gray-800">{header}</h1>
                    )}
                    <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
                        <Link href="/profile" className="hover:text-gray-900">
                            {auth?.user?.name}
                        </Link>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}

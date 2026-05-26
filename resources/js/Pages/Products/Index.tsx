import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function Index({ products, filters, categories }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'products.index',
        filters,
    };

    return (
        <AppLayout header="Produk">
            <Head title="Produk" />
            <PageHeader title="Daftar Produk" createHref="/products/create" />
            <SearchFilter
                routeName="products.index"
                filters={filters}
                filterOptions={[
                    { key: 'category_id', label: 'Semua Kategori', options: categories?.map((c: any) => ({ label: c.name, value: c.id })) ?? [] },
                    { key: 'status', label: 'Semua Status', options: [{ label: 'Aktif', value: 'active' }, { label: 'Tidak Aktif', value: 'inactive' }] },
                ]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="code" label="Kode" {...sortProps} />
                            <SortableColumn sortKey="name" label="Nama" {...sortProps} />
                            <th className="px-4 py-3">Kategori</th>
                            <SortableColumn sortKey="sales_price" label="Sales Price" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="cost" label="Cost" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="stock" label="Stok" className="text-right" {...sortProps} />
                            <th className="px-4 py-3">Satuan</th>
                            <SortableColumn sortKey="status" label="Status" {...sortProps} />
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {products.data?.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                <td className="px-4 py-3 text-gray-500">{p.category?.name ?? '-'}</td>
                                <td className="px-4 py-3 text-right">{fmt(p.sales_price)}</td>
                                <td className="px-4 py-3 text-right">{fmt(p.cost)}</td>
                                <td className={`px-4 py-3 text-right font-medium ${p.stock <= 10 ? 'text-red-600' : ''}`}>{p.stock}</td>
                                <td className="px-4 py-3 text-gray-600">
                                    {p.unit_of_measure
                                        ? <span title={p.unit_of_measure.name}>{p.unit_of_measure.symbol}</span>
                                        : <span className="text-gray-400 italic">—</span>}
                                </td>
                                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/products/${p.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/products/${p.id}`} itemName={p.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {products.links && <Pagination links={products.links} from={products.from} to={products.to} total={products.total} />}
        </AppLayout>
    );
}

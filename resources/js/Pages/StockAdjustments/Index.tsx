import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import ConfirmDelete from '@/Components/ConfirmDelete';
import { Head, Link } from '@inertiajs/react';

export default function Index({ stockAdjustments, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'adjustment_date',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'stock-adjustments.index',
        filters,
    };

    return (
        <AppLayout header="Penyesuaian Stok">
            <Head title="Penyesuaian Stok" />
            <PageHeader title="Penyesuaian Stok" createHref="/stock-adjustments/create" />
            <SearchFilter routeName="stock-adjustments.index" filters={filters}
                filterOptions={[{ key: 'type', label: 'Semua Tipe', options: [
                    { label: 'Penambahan', value: 'addition' },
                    { label: 'Pengurangan', value: 'subtraction' },
                ]}]}
            />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <SortableColumn sortKey="adjustment_number" label="No. Penyesuaian" {...sortProps} />
                            <th className="px-4 py-3">Produk</th>
                            <SortableColumn sortKey="type" label="Tipe" {...sortProps} />
                            <SortableColumn sortKey="adjustment_date" label="Tgl Penyesuaian" {...sortProps} />
                            <SortableColumn sortKey="quantity_before" label="Qty Sebelum" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="quantity_after" label="Qty Setelah" className="text-right" {...sortProps} />
                            <th className="px-4 py-3">Alasan</th>
                            <th className="px-4 py-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {stockAdjustments.data?.map((adj: any) => (
                            <tr key={adj.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs font-medium">{adj.adjustment_number}</td>
                                <td className="px-4 py-3">{adj.product?.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${adj.type === 'addition' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {adj.type === 'addition' ? 'Penambahan' : 'Pengurangan'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{adj.adjustment_date}</td>
                                <td className="px-4 py-3 text-right">{adj.quantity_before}</td>
                                <td className="px-4 py-3 text-right font-semibold">{adj.quantity_after}</td>
                                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{adj.reason}</td>
                                <td className="px-4 py-3 flex gap-3">
                                    <Link href={`/stock-adjustments/${adj.id}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                                    <ConfirmDelete href={`/stock-adjustments/${adj.id}`} itemName={adj.adjustment_number} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {stockAdjustments.links && <Pagination links={stockAdjustments.links} from={stockAdjustments.from} to={stockAdjustments.to} total={stockAdjustments.total} />}
        </AppLayout>
    );
}

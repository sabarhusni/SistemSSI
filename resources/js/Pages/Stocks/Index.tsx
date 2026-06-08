import AppLayout from '@/Layouts/AppLayout';
import SearchFilter from '@/Components/SearchFilter';
import SortableColumn from '@/Components/SortableColumn';
import Pagination from '@/Components/Pagination';
import { Head } from '@inertiajs/react';

export default function Index({ stocks, filters }: any) {
    const sortProps = {
        currentSort: filters.sort_by ?? 'created_at',
        currentDir: filters.sort_dir ?? 'desc',
        routeName: 'stocks.index',
        filters,
    };

    return (
        <AppLayout header="Stock">
            <Head title="Stock" />
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Stock Card</h2>
            </div>
            <SearchFilter routeName="stocks.index" filters={filters} filterOptions={[]} />
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-gray-600">
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Unit</th>
                            <SortableColumn sortKey="quantity" label="Stock" className="text-right" {...sortProps} />
                            <SortableColumn sortKey="minimum_stock" label="Minimum" className="text-right" {...sortProps} />
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {stocks.data?.map((stock: any) => {
                            const isLow = stock.quantity <= stock.minimum_stock;
                            return (
                                <tr key={stock.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs">{stock.product?.code}</td>
                                    <td className="px-4 py-3 font-medium">{stock.product?.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{stock.product?.category?.name}</td>
                                    <td className="px-4 py-3">{stock.product?.unit}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                                        {stock.quantity}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500">{stock.minimum_stock}</td>
                                    <td className="px-4 py-3">
                                        {isLow
                                            ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Low Stock</span>
                                            : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Normal</span>
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {stocks.links && <Pagination links={stocks.links} from={stocks.from} to={stocks.to} total={stocks.total} />}
        </AppLayout>
    );
}

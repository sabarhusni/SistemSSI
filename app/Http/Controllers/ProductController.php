<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\UnitOfMeasure;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['code', 'name', 'sales_price', 'cost', 'stock', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Product::with(['category', 'unitOfMeasure'])
            ->when($request->search, fn($q, $s) => $q->where('name', 'ilike', "%$s%")->orWhere('code', 'ilike', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->product_type, fn($q, $s) => $q->where('product_type', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Products/Index', [
            'products'   => $query->paginate(15)->withQueryString(),
            'filters'    => $request->only('search', 'status', 'product_type', 'sort_by', 'sort_dir'),
            'categories' => ProductCategory::orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function generateNextCode(): string
    {
        $year   = date('y');
        $month  = date('m');
        $prefix = $year . $month;
        $last   = Product::where('code', 'like', $prefix . '%')
            ->orderBy('code', 'desc')
            ->value('code');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 3, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('Products/Form', [
            'categories' => ProductCategory::orderBy('name')->get(),
            'uoms'       => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
            'nextCode'   => $this->generateNextCode(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'               => 'required|string|max:50|unique:products,code',
            'name'               => 'required|string|max:255',
            'category_id'        => 'nullable|uuid|exists:product_categories,id',
            'unit_of_measure_id' => 'nullable|uuid|exists:unit_of_measures,id',
            'description'        => 'nullable|string',
            'internal_note'      => 'nullable|string',
            'sales_price'        => 'nullable|numeric|min:0',
            'cost'               => 'nullable|numeric|min:0',
            'stock'              => 'nullable|integer|min:0',
            'product_type'       => 'required|in:goods,service',
            'status'             => 'required|in:active,inactive',
        ]);

        if (empty($data['code'])) {
            $data['code'] = $this->generateNextCode();
        }

        // Set average_cost = cost sebagai HPP awal
        if (!empty($data['cost'])) {
            $data['average_cost'] = $data['cost'];
        }

        DB::transaction(function () use ($data) {
            $product = Product::create($data);

            // Hanya produk tipe 'goods' yang punya stok fisik
            if ($product->product_type === 'goods') {
                $qty = (int) ($product->stock ?? 0);
                $pusatWarehouse = Warehouse::where('type', 'pusat')->where('status', 'active')->first();

                Stock::create([
                    'product_id'   => $product->id,
                    'warehouse_id' => $pusatWarehouse?->id,
                    'quantity'     => $qty,
                ]);

                if ($qty > 0) {
                    StockMovement::create([
                        'product_id'     => $product->id,
                        'type'           => 'initial_stock',
                        'quantity'       => $qty,
                        'reference_id'   => $product->id,
                        'reference_type' => 'product',
                        'notes'          => 'Stok awal saat pembuatan produk',
                        'created_by'     => Auth::id(),
                    ]);
                }
            }
        });

        return redirect('/products')->with('success', 'Produk berhasil ditambahkan.');
    }

    public function edit(Product $product)
    {
        return Inertia::render('Products/Form', [
            'product'    => $product,
            'categories' => ProductCategory::orderBy('name')->get(),
            'uoms'       => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'code'               => 'required|string|max:50|unique:products,code,' . $product->id,
            'name'               => 'required|string|max:255',
            'category_id'        => 'nullable|uuid|exists:product_categories,id',
            'unit_of_measure_id' => 'nullable|uuid|exists:unit_of_measures,id',
            'description'        => 'nullable|string',
            'internal_note'      => 'nullable|string',
            'sales_price'        => 'nullable|numeric|min:0',
            'cost'               => 'nullable|numeric|min:0',
            'stock'              => 'nullable|integer|min:0',
            'product_type'       => 'required|in:goods,service',
            'status'             => 'required|in:active,inactive',
        ]);

        $product->update($data);

        return redirect('/products')->with('success', 'Produk berhasil diperbarui.');
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return redirect('/products')->with('success', 'Produk berhasil dihapus.');
    }
}

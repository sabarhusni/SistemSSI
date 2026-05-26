<?php

namespace App\Http\Controllers;

use App\Models\SalesOrder;
use App\Models\Contract;
use App\Models\Product;
use App\Models\Setting;
use App\Models\UnitOfMeasure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SalesOrderController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['so_number', 'service_date', 'total_amount', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = SalesOrder::with(['customer', 'salesPerson'])
            ->when($request->search, fn($q, $s) => $q->where('so_number', 'ilike', "%$s%")->orWhereHas('customer', fn($cq) => $cq->where('name', 'ilike', "%$s%")))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('SalesOrders/Index', [
            'salesOrders' => $query->paginate(15)->withQueryString(),
            'filters'     => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'SO' . $year;
        $last   = SalesOrder::where('so_number', 'like', $prefix . '%')
            ->orderBy('so_number', 'desc')
            ->value('so_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('SalesOrders/Form', [
            'contracts'  => Contract::with(['customer', 'services.product'])
                ->where('status', 'active')
                ->orderBy('contract_number')
                ->get(),
            'products'   => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'price', 'sales_price', 'product_type']),
            'uoms'       => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
            'nextNumber' => $this->generateNextNumber(),
            'taxType'    => Setting::get('tax_type', 'exclude'),
            'taxRateSo'  => (float) Setting::get('tax_rate_so', 11),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'so_number'   => 'required|string|max:50|unique:sales_orders,so_number',
            'contract_id' => 'nullable|uuid|exists:contracts,id',
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'order_date'  => 'required|date',
            'status'      => 'required|in:draft,confirmed,completed,cancelled',
            'notes'           => 'nullable|string',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'       => 'required|uuid|exists:products,id',
            'items.*.quantity'         => 'required|numeric|min:0',
            'items.*.uom'              => 'nullable|string|max:50',
            'items.*.uom_conversion'   => 'nullable|numeric|min:0',
            'items.*.unit_price'       => 'required|numeric|min:0',
            'items.*.tax_rate'         => 'nullable|numeric|min:0|max:100',
        ]);

        if (empty($data['customer_id']) && !empty($data['contract_id'])) {
            $data['customer_id'] = Contract::find($data['contract_id'])?->customer_id;
        }

        if (empty($data['so_number'])) {
            $data['so_number'] = $this->generateNextNumber();
        }

        $taxType = Setting::get('tax_type', 'exclude');

        DB::transaction(function () use ($data, $taxType) {
            $itemTax = function (float $sub, float $rate) use ($taxType): float {
                if ($rate <= 0) return 0.0;
                return $taxType === 'exclude'
                    ? $sub * $rate / 100
                    : $sub * $rate / (100 + $rate);
            };

            $items     = collect($data['items']);
            $subtotal  = $items->sum(fn($it) => $it['quantity'] * $it['unit_price']);
            $taxAmount = $items->sum(fn($it) => $itemTax(
                $it['quantity'] * $it['unit_price'],
                (float) ($it['tax_rate'] ?? 0)
            ));
            // exclude: total = subtotal + tax | include: total = subtotal (tax embedded)
            $totalAmount = $taxType === 'exclude' ? $subtotal + $taxAmount : $subtotal;

            $so = SalesOrder::create(array_merge(
                collect($data)->except('items')->toArray(),
                ['total_amount' => $totalAmount, 'tax_amount' => $taxAmount]
            ));

            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $so->items()->create([
                    'product_id'     => $item['product_id'],
                    'quantity'       => $item['quantity'],
                    'uom'            => $item['uom']            ?? null,
                    'uom_conversion' => $item['uom_conversion'] ?? 1,
                    'unit_price'     => $item['unit_price'],
                    'tax_rate'       => $item['tax_rate']       ?? 0,
                    'tax_amount'     => $itemTax($sub, (float) ($item['tax_rate'] ?? 0)),
                    'subtotal'       => $sub,
                ]);
            }
        });

        return redirect('/sales-orders')->with('success', 'Sales Order berhasil dibuat.');
    }

    public function edit(SalesOrder $salesOrder)
    {
        return Inertia::render('SalesOrders/Form', [
            'salesOrder' => $salesOrder->load('items'),
            'contracts'  => Contract::with(['customer', 'services.product'])
                ->where('status', 'active')
                ->orderBy('contract_number')
                ->get(),
            'products'   => Product::where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit', 'price', 'sales_price', 'product_type']),
            'uoms'       => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
            'taxType'    => Setting::get('tax_type', 'exclude'),
            'taxRateSo'  => (float) Setting::get('tax_rate_so', 11),
        ]);
    }

    public function update(Request $request, SalesOrder $salesOrder)
    {
        $data = $request->validate([
            'so_number'   => 'required|string|max:50|unique:sales_orders,so_number,' . $salesOrder->id,
            'contract_id' => 'nullable|uuid|exists:contracts,id',
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'order_date'  => 'required|date',
            'status'      => 'required|in:draft,confirmed,completed,cancelled',
            'notes'           => 'nullable|string',
            'items'                    => 'required|array|min:1',
            'items.*.product_id'       => 'required|uuid|exists:products,id',
            'items.*.quantity'         => 'required|numeric|min:0',
            'items.*.uom'              => 'nullable|string|max:50',
            'items.*.uom_conversion'   => 'nullable|numeric|min:0',
            'items.*.unit_price'       => 'required|numeric|min:0',
            'items.*.tax_rate'         => 'nullable|numeric|min:0|max:100',
        ]);

        if (empty($data['customer_id']) && !empty($data['contract_id'])) {
            $data['customer_id'] = Contract::find($data['contract_id'])?->customer_id;
        }

        $taxType = Setting::get('tax_type', 'exclude');

        DB::transaction(function () use ($data, $salesOrder, $taxType) {
            $itemTax = function (float $sub, float $rate) use ($taxType): float {
                if ($rate <= 0) return 0.0;
                return $taxType === 'exclude'
                    ? $sub * $rate / 100
                    : $sub * $rate / (100 + $rate);
            };

            $items     = collect($data['items']);
            $subtotal  = $items->sum(fn($it) => $it['quantity'] * $it['unit_price']);
            $taxAmount = $items->sum(fn($it) => $itemTax(
                $it['quantity'] * $it['unit_price'],
                (float) ($it['tax_rate'] ?? 0)
            ));
            $totalAmount = $taxType === 'exclude' ? $subtotal + $taxAmount : $subtotal;

            $salesOrder->update(array_merge(
                collect($data)->except('items')->toArray(),
                ['total_amount' => $totalAmount, 'tax_amount' => $taxAmount]
            ));

            $salesOrder->items()->delete();
            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $salesOrder->items()->create([
                    'product_id'     => $item['product_id'],
                    'quantity'       => $item['quantity'],
                    'uom'            => $item['uom']            ?? null,
                    'uom_conversion' => $item['uom_conversion'] ?? 1,
                    'unit_price'     => $item['unit_price'],
                    'tax_rate'       => $item['tax_rate']       ?? 0,
                    'tax_amount'     => $itemTax($sub, (float) ($item['tax_rate'] ?? 0)),
                    'subtotal'       => $sub,
                ]);
            }
        });

        return redirect('/sales-orders')->with('success', 'Sales Order berhasil diperbarui.');
    }

    public function destroy(SalesOrder $salesOrder)
    {
        $salesOrder->delete();

        return redirect('/sales-orders')->with('success', 'Sales Order berhasil dihapus.');
    }
}

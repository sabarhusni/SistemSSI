<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\ReceiveItem;
use App\Models\Journal;
use App\Models\JournalSetting;
use App\Models\UnitOfMeasure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['po_number', 'po_date', 'expected_delivery_date', 'total_amount', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'po_date';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = PurchaseOrder::with('supplier')
            ->when($request->search, fn($q, $s) => $q->where('po_number', 'ilike', "%$s%")->orWhereHas('supplier', fn($sq) => $sq->where('name', 'ilike', "%$s%")))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('PurchaseOrders/Index', [
            'purchaseOrders' => $query->paginate(15)->withQueryString(),
            'filters'        => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    private function generateNextNumber(): string
    {
        $year   = date('y');
        $prefix = 'PO' . $year;
        $last   = PurchaseOrder::where('po_number', 'like', $prefix . '%')
            ->orderBy('po_number', 'desc')
            ->value('po_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('PurchaseOrders/Form', [
            'suppliers'  => Supplier::where('status', 'active')->orderBy('name')->get(),
            'products'   => Product::with('unitOfMeasure')->where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'cost', 'product_type']),
            'uoms'       => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
            'nextNumber' => $this->generateNextNumber(),
            'taxType'    => Setting::get('tax_type', 'exclude'),
            'taxRatePo'  => (float) Setting::get('tax_rate_po', 11),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id'            => 'required|uuid|exists:suppliers,id',
            'po_number'              => 'required|string|max:50|unique:purchase_orders,po_number',
            'po_date'                => 'required|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:po_date',
            'status'                 => 'required|in:draft,sent,received,cancelled',
            'notes'                  => 'nullable|string',
            'payment_terms'          => 'nullable|string|max:100',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'required|uuid|exists:products,id',
            'items.*.quantity'       => 'required|integer|min:1',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.unit'           => 'nullable|string|max:50',
            'items.*.pph'            => 'nullable|numeric|min:0|max:100',
        ]);

        if (empty($data['po_number'])) {
            $data['po_number'] = $this->generateNextNumber();
        }

        $taxType = Setting::get('tax_type', 'exclude');

        DB::transaction(function () use ($data, $taxType) {
            $totalAmount = collect($data['items'])->sum(function ($it) use ($taxType) {
                $sub = $it['quantity'] * $it['unit_price'];
                $pph = (float) ($it['pph'] ?? 0);
                return $taxType === 'exclude' ? $sub + ($sub * $pph / 100) : $sub;
            });
            $po = PurchaseOrder::create(array_merge(
                collect($data)->except('items')->toArray(),
                ['total_amount' => $totalAmount]
            ));

            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $po->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal'   => $sub,
                    'unit'       => $item['unit'] ?? null,
                    'pph'        => isset($item['pph']) && $item['pph'] !== '' ? $item['pph'] : null,
                ]);
            }
        });

        return redirect('/purchase-orders')->with('success', 'Purchase Order berhasil dibuat.');
    }

    public function edit(PurchaseOrder $purchaseOrder)
    {
        return Inertia::render('PurchaseOrders/Form', [
            'purchaseOrder' => $purchaseOrder->load('items'),
            'suppliers'     => Supplier::where('status', 'active')->orderBy('name')->get(),
            'products'      => Product::with('unitOfMeasure')->where('status', 'active')->orderBy('name')->get(['id', 'code', 'name', 'unit_of_measure_id', 'cost', 'product_type']),
            'uoms'          => UnitOfMeasure::where('status', 'active')->orderBy('name')->get(['id', 'name', 'symbol']),
            'taxType'       => Setting::get('tax_type', 'exclude'),
            'taxRatePo'     => (float) Setting::get('tax_rate_po', 11),
        ]);
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'supplier_id'            => 'required|uuid|exists:suppliers,id',
            'po_number'              => 'required|string|max:50|unique:purchase_orders,po_number,' . $purchaseOrder->id,
            'po_date'                => 'required|date',
            'expected_delivery_date' => 'nullable|date|after_or_equal:po_date',
            'status'                 => 'required|in:draft,sent,received,cancelled',
            'notes'                  => 'nullable|string',
            'payment_terms'          => 'nullable|string|max:100',
            'items'                  => 'required|array|min:1',
            'items.*.product_id'     => 'required|uuid|exists:products,id',
            'items.*.quantity'       => 'required|integer|min:1',
            'items.*.unit_price'     => 'required|numeric|min:0',
            'items.*.unit'           => 'nullable|string|max:50',
            'items.*.pph'            => 'nullable|numeric|min:0|max:100',
        ]);

        $taxType = Setting::get('tax_type', 'exclude');

        DB::transaction(function () use ($data, $purchaseOrder, $taxType) {
            $totalAmount = collect($data['items'])->sum(function ($it) use ($taxType) {
                $sub = $it['quantity'] * $it['unit_price'];
                $pph = (float) ($it['pph'] ?? 0);
                return $taxType === 'exclude' ? $sub + ($sub * $pph / 100) : $sub;
            });
            $purchaseOrder->update(array_merge(
                collect($data)->except('items')->toArray(),
                ['total_amount' => $totalAmount]
            ));

            $purchaseOrder->items()->delete();
            foreach ($data['items'] as $item) {
                $sub = $item['quantity'] * $item['unit_price'];
                $purchaseOrder->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal'   => $sub,
                    'unit'       => $item['unit'] ?? null,
                    'pph'        => isset($item['pph']) && $item['pph'] !== '' ? $item['pph'] : null,
                ]);
            }
        });

        return redirect('/purchase-orders')->with('success', 'Purchase Order berhasil diperbarui.');
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->delete();

        return redirect('/purchase-orders')->with('success', 'Purchase Order berhasil dihapus.');
    }

    public function receiveForm(PurchaseOrder $purchaseOrder)
    {
        return Inertia::render('PurchaseOrders/Receive', [
            'purchaseOrder' => $purchaseOrder->load(['items.product', 'supplier']),
        ]);
    }

    public function receiveStore(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'items'               => 'required|array',
            'items.*.id'          => 'required|uuid|exists:purchase_order_items,id',
            'items.*.receive_qty' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($data, $purchaseOrder) {
            // Get journal settings untuk inventory dan AP accounts
            $inventoryAccount = JournalSetting::where('account_code', Setting::get('journal_account_inventory', '1300'))
                ->active()
                ->first();
            $apAccount = JournalSetting::where('account_code', Setting::get('journal_account_ap', '2100'))
                ->active()
                ->first();

            foreach ($data['items'] as $row) {
                $qty = (int) $row['receive_qty'];
                if ($qty <= 0) continue;

                $item = $purchaseOrder->items()->find($row['id']);
                if (!$item) continue;

                $product = $item->product;
                $unitCost = $item->unit_price;
                $totalCost = $qty * $unitCost;

                // Update received_qty
                $item->increment('received_qty', $qty);

                // Calculate average cost (weighted average method)
                $currentStock = Stock::where('product_id', $product->id)->first();
                $currentQty = $currentStock ? $currentStock->quantity : 0;
                $currentCost = $product->average_cost ?? $product->cost ?? 0;

                // Formula: (current_qty * current_cost + received_qty * unit_cost) / (current_qty + received_qty)
                $newAverageCost = $currentQty > 0
                    ? (($currentQty * $currentCost) + ($qty * $unitCost)) / ($currentQty + $qty)
                    : $unitCost;

                // Update product average cost
                $product->update(['average_cost' => $newAverageCost]);

                // Update products.stock
                Product::where('id', $product->id)->increment('stock', $qty);

                // Upsert stocks table dengan average cost
                $stock = Stock::withoutGlobalScopes()->firstOrNew(['product_id' => $product->id]);
                if ($stock->exists) {
                    $stock->increment('quantity', $qty);
                } else {
                    $stock->quantity = $qty;
                }
                $stock->save();

                // Create ReceiveItem record
                ReceiveItem::create([
                    'purchase_order_id' => $purchaseOrder->id,
                    'purchase_order_item_id' => $item->id,
                    'product_id' => $product->id,
                    'received_quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'total_cost' => $totalCost,
                    'average_cost' => $newAverageCost,
                    'received_date' => now()->format('Y-m-d'),
                    'notes' => 'Penerimaan dari PO ' . $purchaseOrder->po_number,
                ]);

                // Create journal entry untuk pembelian barang
                if ($inventoryAccount && $apAccount) {
                    Journal::create([
                        'journal_date' => now()->format('Y-m-d'),
                        'description' => 'Penerimaan barang ' . $product->name . ' dari ' . $purchaseOrder->supplier->name,
                        'debit_account_id' => $inventoryAccount->id,
                        'credit_account_id' => $apAccount->id,
                        'amount' => $totalCost,
                        'transaction_type' => 'purchase_receive',
                        'reference_id' => $purchaseOrder->id,
                        'reference_type' => 'purchase_order',
                        'reference_number' => $purchaseOrder->po_number,
                        'notes' => 'Qty: ' . $qty . ', Unit Cost: ' . $unitCost . ', Avg Cost: ' . $newAverageCost,
                    ]);
                }

                // Audit trail
                StockMovement::create([
                    'product_id'     => $product->id,
                    'type'           => 'purchase_receipt',
                    'quantity'       => $qty,
                    'reference_id'   => $purchaseOrder->id,
                    'reference_type' => 'purchase_order',
                    'notes'          => 'Penerimaan PO ' . $purchaseOrder->po_number . ' - Avg Cost: ' . $newAverageCost,
                    'created_by'     => Auth::id(),
                ]);
            }

            $allReceived = $purchaseOrder->items()->get()->every(
                fn($it) => $it->received_qty >= $it->quantity
            );

            if ($allReceived) {
                $purchaseOrder->update(['status' => 'received']);
            }
        });

        return redirect('/purchase-orders')->with('success', 'Penerimaan barang berhasil dicatat dengan average cost method.');
    }
}

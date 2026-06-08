<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ContractController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['contract_number', 'start_date', 'end_date', 'contract_value', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Contract::with('customer')
            ->withCount(['salesOrders as active_so_count' => fn($q) => $q->whereNotIn('status', ['draft', 'cancelled'])])
            ->when($request->search, fn($q, $s) => $q->where('contract_number', 'ilike', "%$s%")->orWhereHas('customer', fn($cq) => $cq->where('name', 'ilike', "%$s%")))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Contracts/Index', [
            'contracts' => $query->paginate(15)->withQueryString(),
            'filters'   => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Contracts/Form', [
            'customers' => Customer::where('status', 'active')->orderBy('name')->get(),
            'products'  => Product::where('status', 'active')->orderBy('name')
                ->with('unitOfMeasure:id,name,symbol')
                ->get(['id', 'name', 'unit_of_measure_id', 'price', 'sales_price', 'product_type']),
            'employees' => Employee::where('status', 'active')->orderBy('name')->get(['id', 'name', 'position', 'department']),
            'taxType'   => Setting::get('tax_type', 'exclude'),
            'taxRateSo' => (float) Setting::get('tax_rate_so', 11),
        ]);
    }

    /**
     * Tax amount for a single line, honoring the global tax type (exclude/include).
     */
    private function lineTax(float $sub, float $rate, string $taxType): float
    {
        if ($rate <= 0) return 0.0;
        return $taxType === 'exclude'
            ? $sub * $rate / 100
            : $sub * $rate / (100 + $rate);
    }

    /**
     * Contract value = grand total per month (incl. tax) × duration in months.
     * Iterates premises → products. Visit frequency is informational only.
     */
    private function computeContractValue(array $premises, int $months, string $taxType): float
    {
        $subtotal = 0.0;
        $taxTotal = 0.0;
        foreach ($premises as $premise) {
            foreach (($premise['products'] ?? []) as $prod) {
                if (empty($prod['product_id'])) continue;
                $sub = (float) $prod['quantity'] * (float) $prod['unit_price'];
                $subtotal += $sub;
                $taxTotal += $this->lineTax($sub, (float) ($prod['tax_rate'] ?? 0), $taxType);
            }
        }
        // exclude: tax added on top | include: tax already embedded in subtotal
        $grandPerMonth = $taxType === 'exclude' ? $subtotal + $taxTotal : $subtotal;
        return $grandPerMonth * max($months, 1);
    }

    /**
     * Validation rules shared by store/update (the unique rule differs per caller).
     */
    private function rules(string $contractNumberUnique): array
    {
        return [
            'customer_id'            => 'required|uuid|exists:customers,id',
            'contract_number'        => 'required|string|max:50|' . $contractNumberUnique,
            'start_date'             => 'required|date',
            'end_date'               => 'required|date|after:start_date',
            'duration_months'        => 'required|integer|min:1',
            'invoice_frequency'      => 'required|integer|min:1',
            'status'                 => 'required|in:draft,active,completed,cancelled',
            'notes'                  => 'nullable|string',
            'sales_type'             => 'nullable|in:canvas,lead',
            'sales_name'             => 'nullable|string|max:100',
            'lead_name'              => 'nullable|string|max:100',
            'sales_employee_id'      => 'nullable|uuid|exists:employees,id',
            'lead_employee_id'       => 'nullable|uuid|exists:employees,id',
            'premises'                          => 'nullable|array',
            'premises.*.location'               => 'required|string|max:255',
            'premises.*.address'                => 'nullable|string',
            'premises.*.pic'                    => 'nullable|string|max:255',
            'premises.*.phone'                  => 'nullable|string|max:50',
            'premises.*.email'                  => 'nullable|email|max:255',
            'premises.*.visit_frequency'        => 'nullable|integer|min:0',
            'premises.*.products'                          => 'nullable|array',
            'premises.*.products.*.product_id'             => 'required|uuid|exists:products,id',
            'premises.*.products.*.quantity'               => 'required|integer|min:1',
            'premises.*.products.*.unit_price'             => 'required|numeric|min:0',
            'premises.*.products.*.tax_rate'               => 'nullable|numeric|min:0|max:100',
            'premises.*.products.*.location_note'          => 'nullable|string|max:255',
            'premises.*.products.*.sub_products'                => 'nullable|array',
            'premises.*.products.*.sub_products.*.product_id'   => 'required|uuid|exists:products,id',
            'premises.*.products.*.sub_products.*.quantity'     => 'required|integer|min:1',
        ];
    }

    /**
     * Within each premise, the same product may not be selected twice.
     */
    private function hasDuplicateProductPerPremise(array $premises): bool
    {
        foreach ($premises as $premise) {
            $ids = array_column($premise['products'] ?? [], 'product_id');
            if (count($ids) !== count(array_unique($ids))) return true;
        }
        return false;
    }

    /**
     * Persist premises → products (ContractService) → sub-products for a contract.
     */
    private function savePremises(Contract $contract, array $premises, string $taxType): void
    {
        foreach (array_values($premises) as $pi => $prem) {
            $premise = $contract->premises()->create([
                'location'        => $prem['location'],
                'address'         => $prem['address'] ?? null,
                'pic'             => $prem['pic'] ?? null,
                'phone'           => $prem['phone'] ?? null,
                'email'           => $prem['email'] ?? null,
                'visit_frequency' => $prem['visit_frequency'] ?? null,
                'sort_order'      => $pi,
            ]);

            foreach (($prem['products'] ?? []) as $prod) {
                if (empty($prod['product_id'])) continue;
                $sub  = $prod['quantity'] * $prod['unit_price'];
                $rate = (float) ($prod['tax_rate'] ?? 0);
                $service = $contract->services()->create([
                    'contract_premise_id' => $premise->id,
                    'product_id'      => $prod['product_id'],
                    'quantity'        => $prod['quantity'],
                    'unit_price'      => $prod['unit_price'],
                    'total_price'     => $sub,
                    'tax_rate'        => $rate,
                    'tax_amount'      => $this->lineTax($sub, $rate, $taxType),
                    'location'        => $prod['location_note'] ?? null,
                ]);

                foreach (($prod['sub_products'] ?? []) as $sp) {
                    if (!empty($sp['product_id'])) {
                        $service->subProducts()->create([
                            'product_id' => $sp['product_id'],
                            'quantity'   => $sp['quantity'],
                        ]);
                    }
                }
            }
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules('unique:contracts,contract_number'));

        if ($this->hasDuplicateProductPerPremise($data['premises'] ?? [])) {
            return back()->withErrors(['premises' => 'Produk tidak boleh duplikat dalam satu premis.'])->withInput();
        }

        $taxType = Setting::get('tax_type', 'exclude');
        $data['contract_value'] = $this->computeContractValue($data['premises'] ?? [], (int) $data['duration_months'], $taxType);

        DB::transaction(function () use ($data, $taxType) {
            $contract = Contract::create(collect($data)->except('premises')->toArray());
            $this->savePremises($contract, $data['premises'] ?? [], $taxType);
        });

        return redirect('/contracts')->with('success', 'Kontrak berhasil ditambahkan.');
    }

    public function edit(Contract $contract)
    {
        return Inertia::render('Contracts/Form', [
            'contract'  => $contract->load(['premises.services.subProducts']),
            'customers' => Customer::where('status', 'active')->orderBy('name')->get(),
            'products'  => Product::where('status', 'active')->orderBy('name')
                ->with('unitOfMeasure:id,name,symbol')
                ->get(['id', 'name', 'unit_of_measure_id', 'price', 'sales_price', 'product_type']),
            'employees' => Employee::where('status', 'active')->orderBy('name')->get(['id', 'name', 'position', 'department']),
            'taxType'   => Setting::get('tax_type', 'exclude'),
            'taxRateSo' => (float) Setting::get('tax_rate_so', 11),
            'locked'    => $contract->hasActiveSalesOrder(),
        ]);
    }

    public function update(Request $request, Contract $contract)
    {
        if ($contract->hasActiveSalesOrder()) {
            return back()->withErrors([
                'contract' => 'Kontrak tidak dapat diubah karena memiliki Sales Order yang masih aktif.',
            ])->withInput();
        }

        $data = $request->validate($this->rules('unique:contracts,contract_number,' . $contract->id));

        if ($this->hasDuplicateProductPerPremise($data['premises'] ?? [])) {
            return back()->withErrors(['premises' => 'Produk tidak boleh duplikat dalam satu premis.'])->withInput();
        }

        $taxType = Setting::get('tax_type', 'exclude');
        $data['contract_value'] = $this->computeContractValue($data['premises'] ?? [], (int) $data['duration_months'], $taxType);

        DB::transaction(function () use ($data, $contract, $taxType) {
            $contract->update(collect($data)->except('premises')->toArray());

            // Replace existing premises/services/sub-products.
            foreach ($contract->services as $oldService) {
                $oldService->subProducts()->delete();
            }
            $contract->services()->delete();
            $contract->premises()->delete();

            $this->savePremises($contract, $data['premises'] ?? [], $taxType);

            // Propagate value change to related draft SOs.
            foreach ($contract->salesOrders()->where('status', 'draft')->get() as $so) {
                $newSubtotal = collect($data['premises'] ?? [])->flatMap(fn($p) => $p['products'] ?? [])->sum(
                    fn($prod) => ($prod['quantity'] ?? 0) * ($prod['unit_price'] ?? 0)
                );
                $newTaxAmount = $so->items->sum(fn($it) => $it->tax_amount ?? 0);
                $so->update([
                    'total_amount' => $newSubtotal + $newTaxAmount,
                ]);
            }
        });

        return redirect('/contracts')->with('success', 'Kontrak berhasil diperbarui.');
    }

    public function destroy(Contract $contract)
    {
        if ($contract->hasActiveSalesOrder()) {
            return back()->with('error', 'Kontrak tidak dapat dihapus karena memiliki Sales Order yang masih aktif.');
        }

        $contract->delete();

        return redirect('/contracts')->with('success', 'Kontrak berhasil dihapus.');
    }

    /**
     * Printable contract document.
     */
    public function print(Contract $contract)
    {
        $contract->load([
            'customer',
            'premises.services.product.unitOfMeasure',
            'premises.services.subProducts.product.unitOfMeasure',
            'salesEmployee',
            'leadEmployee',
        ]);

        return Inertia::render('Contracts/Print', [
            'contract'    => $contract,
            'companyName' => Setting::get('company_name', ''),
            'taxType'     => Setting::get('tax_type', 'exclude'),
        ]);
    }
}

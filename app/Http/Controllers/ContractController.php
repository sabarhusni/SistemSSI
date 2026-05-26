<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Product;
use App\Models\WorkOrder;
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
            'products'  => Product::where('status', 'active')->orderBy('name')->get(['id', 'name', 'unit', 'price', 'product_type']),
            'employees' => Employee::where('status', 'active')->orderBy('name')->get(['id', 'name', 'position', 'department']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id'            => 'required|uuid|exists:customers,id',
            'contract_number'        => 'required|string|max:50|unique:contracts,contract_number',
            'start_date'             => 'required|date',
            'end_date'               => 'required|date|after:start_date',
            'contract_value'         => 'required|numeric|min:0',
            'service_area'           => 'required|string|max:255',
            'visit_frequency'        => 'required|integer|min:1',
            'invoice_frequency'      => 'required|integer|min:1',
            'status'                 => 'required|in:draft,active,completed,cancelled',
            'notes'                  => 'nullable|string',
            'sales_type'             => 'nullable|in:canvas,lead',
            'sales_name'             => 'nullable|string|max:100',
            'lead_name'              => 'nullable|string|max:100',
            'sales_employee_id'      => 'nullable|uuid|exists:employees,id',
            'lead_employee_id'       => 'nullable|uuid|exists:employees,id',
            'services'               => 'nullable|array',
            'services.*.product_id'  => 'required|uuid|exists:products,id',
            'services.*.quantity'    => 'required|integer|min:1',
            'services.*.unit_price'  => 'required|numeric|min:0',
            'services.*.location'    => 'nullable|string|max:255',
            'services.*.sub_products'               => 'nullable|array',
            'services.*.sub_products.*.product_id'  => 'required|uuid|exists:products,id',
            'services.*.sub_products.*.quantity'    => 'required|integer|min:1',
            'visit_plans'                  => 'nullable|array',
            'visit_plans.*.visit_number'   => 'required|integer|min:1',
            'visit_plans.*.planned_date'   => 'nullable|date',
            'visit_plans.*.notes'          => 'nullable|string|max:255',
        ]);

        // Validasi duplikat product_id di services
        if (!empty($data['services'])) {
            $productIds = array_column($data['services'], 'product_id');
            $uniqueIds = array_unique($productIds);
            if (count($productIds) !== count($uniqueIds)) {
                return back()->withErrors(['services' => 'Produk tidak boleh duplikat dalam layanan kontrak.'])->withInput();
            }
        }

        // Always store visit_frequency_unit as derived/default
        $data['visit_frequency_unit'] = 'month';

        DB::transaction(function () use ($data) {
            $contract = Contract::create(collect($data)->except('services', 'visit_plans')->toArray());

            foreach (($data['services'] ?? []) as $svc) {
                if (!empty($svc['product_id'])) {
                    $service = $contract->services()->create([
                        'product_id'  => $svc['product_id'],
                        'quantity'    => $svc['quantity'],
                        'unit_price'  => $svc['unit_price'],
                        'total_price' => $svc['quantity'] * $svc['unit_price'],
                        'location'    => $svc['location'] ?? null,
                    ]);

                    foreach (($svc['sub_products'] ?? []) as $sub) {
                        if (!empty($sub['product_id'])) {
                            $service->subProducts()->create([
                                'product_id' => $sub['product_id'],
                                'quantity'   => $sub['quantity'],
                            ]);
                        }
                    }
                }
            }

            foreach (($data['visit_plans'] ?? []) as $vp) {
                $contract->visitPlans()->create([
                    'visit_number' => $vp['visit_number'],
                    'planned_date' => $vp['planned_date'] ?? null,
                    'notes'        => $vp['notes'] ?? null,
                ]);
            }
        });

        return redirect('/contracts')->with('success', 'Kontrak berhasil ditambahkan.');
    }

    public function edit(Contract $contract)
    {
        return Inertia::render('Contracts/Form', [
            'contract'  => $contract->load(['services.subProducts', 'visitPlans']),
            'customers' => Customer::where('status', 'active')->orderBy('name')->get(),
            'products'  => Product::where('status', 'active')->orderBy('name')->get(['id', 'name', 'unit', 'price', 'product_type']),
            'employees' => Employee::where('status', 'active')->orderBy('name')->get(['id', 'name', 'position', 'department']),
        ]);
    }

    public function update(Request $request, Contract $contract)
    {
        $data = $request->validate([
            'customer_id'            => 'required|uuid|exists:customers,id',
            'contract_number'        => 'required|string|max:50|unique:contracts,contract_number,' . $contract->id,
            'start_date'             => 'required|date',
            'end_date'               => 'required|date|after:start_date',
            'contract_value'         => 'required|numeric|min:0',
            'service_area'           => 'required|string|max:255',
            'visit_frequency'        => 'required|integer|min:1',
            'invoice_frequency'      => 'required|integer|min:1',
            'status'                 => 'required|in:draft,active,completed,cancelled',
            'notes'                  => 'nullable|string',
            'sales_type'             => 'nullable|in:canvas,lead',
            'sales_name'             => 'nullable|string|max:100',
            'lead_name'              => 'nullable|string|max:100',
            'sales_employee_id'      => 'nullable|uuid|exists:employees,id',
            'lead_employee_id'       => 'nullable|uuid|exists:employees,id',
            'services'               => 'nullable|array',
            'services.*.product_id'  => 'required|uuid|exists:products,id',
            'services.*.quantity'    => 'required|integer|min:1',
            'services.*.unit_price'  => 'required|numeric|min:0',
            'services.*.location'    => 'nullable|string|max:255',
            'services.*.sub_products'               => 'nullable|array',
            'services.*.sub_products.*.product_id'  => 'required|uuid|exists:products,id',
            'services.*.sub_products.*.quantity'    => 'required|integer|min:1',
            'visit_plans'                  => 'nullable|array',
            'visit_plans.*.visit_number'   => 'required|integer|min:1',
            'visit_plans.*.planned_date'   => 'nullable|date',
            'visit_plans.*.notes'          => 'nullable|string|max:255',
        ]);

        // Validasi duplikat product_id di services
        if (!empty($data['services'])) {
            $productIds = array_column($data['services'], 'product_id');
            $uniqueIds = array_unique($productIds);
            if (count($productIds) !== count($uniqueIds)) {
                return back()->withErrors(['services' => 'Produk tidak boleh duplikat dalam layanan kontrak.'])->withInput();
            }
        }

        $data['visit_frequency_unit'] = 'month';

        DB::transaction(function () use ($data, $contract) {
            $oldServiceArea = $contract->service_area;
            $contract->update(collect($data)->except('services', 'visit_plans')->toArray());

            // Sync services
            foreach ($contract->services as $oldService) {
                $oldService->subProducts()->delete();
            }
            $contract->services()->delete();

            foreach (($data['services'] ?? []) as $svc) {
                if (!empty($svc['product_id'])) {
                    $service = $contract->services()->create([
                        'product_id'  => $svc['product_id'],
                        'quantity'    => $svc['quantity'],
                        'unit_price'  => $svc['unit_price'],
                        'total_price' => $svc['quantity'] * $svc['unit_price'],
                        'location'    => $svc['location'] ?? null,
                    ]);

                    foreach (($svc['sub_products'] ?? []) as $sub) {
                        if (!empty($sub['product_id'])) {
                            $service->subProducts()->create([
                                'product_id' => $sub['product_id'],
                                'quantity'   => $sub['quantity'],
                            ]);
                        }
                    }
                }
            }

            // Sync visit plans
            $contract->visitPlans()->delete();
            foreach (($data['visit_plans'] ?? []) as $vp) {
                $contract->visitPlans()->create([
                    'visit_number' => $vp['visit_number'],
                    'planned_date' => $vp['planned_date'] ?? null,
                    'notes'        => $vp['notes'] ?? null,
                ]);
            }

            // Propagate service_area change to pending/in_progress WOs
            if ($data['service_area'] !== $oldServiceArea) {
                $contract->workOrders()
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->update(['service_area' => $data['service_area']]);
            }

            // Propagate service changes to related draft SOs: update SO total from contract_value
            foreach ($contract->salesOrders()->where('status', 'draft')->get() as $so) {
                $newSubtotal = collect($data['services'] ?? [])->sum(
                    fn($s) => ($s['quantity'] ?? 0) * ($s['unit_price'] ?? 0)
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
        $contract->delete();

        return redirect('/contracts')->with('success', 'Kontrak berhasil dihapus.');
    }

    /**
     * Auto-generate Work Orders for all visit plans in this contract.
     */
    public function generateWorkOrders(Contract $contract)
    {
        $visitPlans = $contract->visitPlans()->get();

        if ($visitPlans->isEmpty()) {
            return back()->with('error', 'Belum ada rencana kunjungan. Tambahkan rencana kunjungan terlebih dahulu.');
        }

        // Find first active/confirmed SO for this contract
        $so = $contract->salesOrders()->whereIn('status', ['confirmed', 'active'])->first();

        DB::transaction(function () use ($contract, $visitPlans, $so) {
            foreach ($visitPlans as $plan) {
                // Skip if WO for this plan date already exists
                $exists = WorkOrder::where('contract_id', $contract->id)
                    ->where('visit_date', $plan->planned_date)
                    ->exists();

                if ($exists || !$plan->planned_date) continue;

                $woNumber = 'WO-' . strtoupper(substr($contract->contract_number, -6)) . '-' . str_pad($plan->visit_number, 3, '0', STR_PAD_LEFT);

                // Ensure unique wo_number
                $base   = $woNumber;
                $suffix = 1;
                while (WorkOrder::where('wo_number', $woNumber)->exists()) {
                    $woNumber = $base . '-' . $suffix++;
                }

                WorkOrder::create([
                    'contract_id'    => $contract->id,
                    'sales_order_id' => $so?->id,
                    'technician_id'  => null,
                    'wo_number'      => $woNumber,
                    'visit_date'     => $plan->planned_date,
                    'service_area'   => $contract->service_area,
                    'visit_types'    => ['routine'],
                    'status'         => 'pending',
                ]);
            }
        });

        return back()->with('success', 'Work Order berhasil di-generate dari rencana kunjungan.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Customer;
use App\Models\SalesOrder;
use App\Models\SalesOrderVisitPlan;
use App\Models\Invoice;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $currentMonth = Carbon::now();

        $stats = [
            'total_customers' => Customer::count(),
            'total_active_contracts' => Contract::where('status', 'active')->count(),
            'total_sales_orders' => SalesOrder::whereMonth('created_at', $currentMonth->month)->count(),
            'total_service_orders' => WorkOrder::whereMonth('created_at', $currentMonth->month)->count(),
            'revenue_this_month' => Invoice::whereMonth('created_at', $currentMonth->month)->sum('total_amount'),
            'overdue_invoices' => Invoice::where('due_date', '<', Carbon::now())
                ->whereIn('status', ['draft', 'sent'])
                ->count(),
        ];

        $activeServiceOrders = WorkOrder::where('status', '!=', 'completed')
            ->with(['salesOrder', 'technician'])
            ->orderBy('visit_date')
            ->limit(10)
            ->get();

        $overdueInvoices = Invoice::where('due_date', '<', Carbon::now())
            ->whereIn('status', ['draft', 'sent'])
            ->with('customer')
            ->limit(10)
            ->get();

        $revenueChart = $this->getRevenueChart();
        $transactionChart = $this->getTransactionChart();

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'activeServiceOrders' => $activeServiceOrders,
            'overdueInvoices' => $overdueInvoices,
            'revenueChart' => $revenueChart,
            'transactionChart' => $transactionChart,
            'visitEvents' => $this->getVisitEvents(),
            'visitVsWoChart' => $this->getVisitVsWoChart(),
        ]);
    }

    /**
     * Perbandingan jumlah Visit Plan vs Work Order yang sudah dibuatkan per bulan
     * untuk tahun berjalan. Keduanya dikelompokkan berdasarkan bulan visit_date,
     * sehingga terlihat berapa rencana visit yang sudah ada WO-nya tiap bulan.
     */
    private function getVisitVsWoChart()
    {
        $year = Carbon::now()->year;

        $planCounts = SalesOrderVisitPlan::whereYear('visit_date', $year)
            ->selectRaw('EXTRACT(MONTH FROM visit_date)::int as m, COUNT(*) as c')
            ->groupBy('m')->pluck('c', 'm');

        // Hitung semua WO yang sudah dibuat (per bulan visit_date), tidak terbatas pada
        // WO yang terikat visit plan, agar jumlahnya sesuai dengan WO yang benar-benar diinput.
        $woCounts = WorkOrder::whereYear('visit_date', $year)
            ->selectRaw('EXTRACT(MONTH FROM visit_date)::int as m, COUNT(*) as c')
            ->groupBy('m')->pluck('c', 'm');

        $months = [];
        $visitPlans = [];
        $workOrders = [];
        for ($mo = 1; $mo <= 12; $mo++) {
            $months[] = Carbon::create($year, $mo, 1)->format('M');
            $visitPlans[] = (int) ($planCounts[$mo] ?? 0);
            $workOrders[] = (int) ($woCounts[$mo] ?? 0);
        }

        return [
            'year'        => $year,
            'months'      => $months,
            'visit_plans' => $visitPlans,
            'work_orders' => $workOrders,
        ];
    }

    /**
     * Jadwal Visit Plan untuk kalender dashboard. Tiap visit plan menyertakan no kontrak & no SO;
     * bila sudah ada Work Order yang menunjuk visit plan tsb, ditambahkan no WO, nama teknisi,
     * dan jam (time_in–time_out) sebagai sumber informasi waktu pada kalender.
     */
    private function getVisitEvents()
    {
        // Work Order yang terikat ke visit plan, diindeks per sales_order_visit_plan_id.
        $workOrders = WorkOrder::whereNotNull('sales_order_visit_plan_id')
            ->with('technician:id,name')
            ->get(['id', 'wo_number', 'sales_order_visit_plan_id', 'technician_id', 'time_in', 'time_out', 'status'])
            ->keyBy('sales_order_visit_plan_id');

        return SalesOrderVisitPlan::whereNotNull('visit_date')
            ->with([
                'salesOrder:id,contract_id,so_number,customer_id',
                'salesOrder.contract:id,contract_number',
                'salesOrder.customer:id,name',
            ])
            ->orderBy('visit_date')
            ->get(['id', 'sales_order_id', 'visit_number', 'visit_date'])
            ->map(function (SalesOrderVisitPlan $plan) use ($workOrders) {
                $wo = $workOrders->get($plan->id);
                return [
                    'id'              => $plan->id,
                    'visit_number'    => $plan->visit_number,
                    'date'            => $plan->visit_date?->format('Y-m-d'),
                    'contract_number' => $plan->salesOrder?->contract?->contract_number,
                    'so_number'       => $plan->salesOrder?->so_number,
                    'customer_name'   => $plan->salesOrder?->customer?->name,
                    'wo_id'           => $wo?->id,
                    'wo_number'       => $wo?->wo_number,
                    'technician'      => $wo?->technician?->name,
                    'time_in'         => $wo?->time_in ? substr($wo->time_in, 0, 5) : null,
                    'time_out'        => $wo?->time_out ? substr($wo->time_out, 0, 5) : null,
                    'status'          => $wo?->status,
                ];
            })
            ->values();
    }

    private function getRevenueChart()
    {
        $months = [];
        $revenues = [];

        for ($i = 11; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $months[] = $date->format('M Y');
            $revenues[] = Invoice::whereMonth('created_at', $date->month)
                ->whereYear('created_at', $date->year)
                ->sum('total_amount');
        }

        return ['months' => $months, 'revenues' => $revenues];
    }

    private function getTransactionChart()
    {
        $currentMonth = Carbon::now();

        return [
            'sales_orders' => SalesOrder::whereMonth('created_at', $currentMonth->month)->count(),
            'work_orders' => WorkOrder::whereMonth('created_at', $currentMonth->month)->count(),
            'invoices' => Invoice::whereMonth('created_at', $currentMonth->month)->count(),
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Customer;
use App\Models\SalesOrder;
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
        ]);
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

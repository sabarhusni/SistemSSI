<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrder extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id', 'sales_order_id', 'sales_order_item_id', 'sales_order_visit_plan_id', 'month', 'technician_id', 'wo_number', 'visit_date',
        'time_in', 'time_out', 'service_area', 'visit_types', 'status', 'technician_notes',
    ];

    protected $casts = [
        'visit_types' => 'array',
        'visit_date'  => 'date:Y-m-d',
    ];

    public function contract() { return $this->belongsTo(Contract::class); }
    public function salesOrder() { return $this->belongsTo(SalesOrder::class); }
    public function salesOrderItem() { return $this->belongsTo(SalesOrderItem::class); }
    public function salesOrderVisitPlan() { return $this->belongsTo(SalesOrderVisitPlan::class); }
    public function technician() { return $this->belongsTo(Employee::class, 'technician_id'); }
    public function materials() { return $this->hasMany(WorkOrderMaterial::class); }
    public function invoices()  { return $this->belongsToMany(Invoice::class, 'invoice_work_orders')->using(InvoiceWorkOrder::class)->withTimestamps(); }

    /**
     * Work Order yang masih "aktif" (belum Completed/Cancelled) pada satu Sales Order
     * untuk bulan layanan tertentu (dicocokkan lewat material WO). Dipakai untuk memblok
     * Invoice & Payment selama produk service per bulan masih punya WO berjalan.
     */
    public static function activeForSalesOrderMonths(?string $salesOrderId, array $months)
    {
        $months = array_values(array_unique(array_map('intval', $months)));
        if (empty($salesOrderId) || empty($months)) {
            return collect();
        }

        return static::where('sales_order_id', $salesOrderId)
            ->whereIn('status', ['pending', 'in_progress'])
            ->whereHas('materials', fn($q) => $q->whereIn('month', $months))
            ->orderBy('wo_number')
            ->get(['id', 'wo_number', 'status']);
    }
}

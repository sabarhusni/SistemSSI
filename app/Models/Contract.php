<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'customer_id', 'contract_number', 'start_date', 'end_date', 'duration_months',
        'contract_value', 'invoice_frequency', 'status', 'notes',
        'sales_type', 'sales_name', 'lead_name',
        'sales_employee_id', 'lead_employee_id',
    ];

    public function customer() { return $this->belongsTo(Customer::class); }
    public function premises() { return $this->hasMany(ContractPremise::class)->orderBy('sort_order'); }
    public function services() { return $this->hasMany(ContractService::class); }
    public function salesOrders() { return $this->hasMany(SalesOrder::class); }
    public function workOrders() { return $this->hasMany(WorkOrder::class); }
    public function salesEmployee() { return $this->belongsTo(\App\Models\Employee::class, 'sales_employee_id'); }
    public function leadEmployee() { return $this->belongsTo(\App\Models\Employee::class, 'lead_employee_id'); }

    /**
     * Sales Orders yang dianggap "aktif": sudah melewati draft dan belum dibatalkan
     * (status confirmed/completed). Selama masih draft, kontrak boleh diubah karena
     * perubahan nilai dipropagasi ke SO draft tersebut.
     */
    public function activeSalesOrders()
    {
        return $this->salesOrders()->whereNotIn('status', ['draft', 'cancelled']);
    }

    public function hasActiveSalesOrder(): bool
    {
        return $this->activeSalesOrders()->exists();
    }
}

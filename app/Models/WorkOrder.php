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
        'contract_id', 'sales_order_id', 'technician_id', 'wo_number', 'visit_date',
        'time_in', 'time_out', 'service_area', 'visit_types', 'status', 'technician_notes',
    ];

    protected $casts = [
        'visit_types' => 'array',
    ];

    public function contract() { return $this->belongsTo(Contract::class); }
    public function salesOrder() { return $this->belongsTo(SalesOrder::class); }
    public function technician() { return $this->belongsTo(User::class, 'technician_id'); }
    public function materials() { return $this->hasMany(WorkOrderMaterial::class); }
}

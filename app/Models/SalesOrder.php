<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrder extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id', 'customer_id',
        'so_number', 'order_date', 'status',
        'notes', 'total_amount', 'tax_rate', 'tax_amount',
    ];

    public function customer() { return $this->belongsTo(Customer::class); }
    public function contract() { return $this->belongsTo(Contract::class); }
    public function salesPerson() { return $this->belongsTo(User::class, 'sales_person_id'); }
    public function technician() { return $this->belongsTo(User::class, 'technician_id'); }
    public function items() { return $this->hasMany(SalesOrderItem::class); }
    public function workOrders() { return $this->hasMany(WorkOrder::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
}

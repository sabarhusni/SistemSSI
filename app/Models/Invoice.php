<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id', 'billing_method', 'customer_id', 'customer_name',
        'billing_pic_name', 'billing_pic_position', 'billing_pic_email', 'billing_pic_phone', 'billing_pic_address',
        'invoice_number', 'invoice_date', 'due_date',
        'tax_rate', 'subtotal', 'tax', 'total_amount', 'paid_amount',
        'status', 'notes', 'created_by',
    ];

    public function contract()    { return $this->belongsTo(Contract::class); }
    public function customer()    { return $this->belongsTo(Customer::class); }
    public function creator()     { return $this->belongsTo(User::class, 'created_by'); }
    public function workOrders()  { return $this->belongsToMany(WorkOrder::class, 'invoice_work_orders')->using(InvoiceWorkOrder::class)->withTimestamps(); }
    public function invoiceWorkOrders() { return $this->hasMany(InvoiceWorkOrder::class, 'invoice_id'); }
    public function items()       { return $this->hasMany(InvoiceItem::class); }
    public function payments()    { return $this->hasMany(Payment::class); }
}

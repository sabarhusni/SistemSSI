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
        'contract_id', 'customer_id', 'sales_order_id',
        'invoice_number', 'invoice_date', 'due_date',
        'tax_rate', 'subtotal', 'tax', 'total_amount', 'paid_amount',
        'status', 'notes',
    ];

    public function contract()    { return $this->belongsTo(Contract::class); }
    public function customer()    { return $this->belongsTo(Customer::class); }
    public function salesOrder()  { return $this->belongsTo(SalesOrder::class); }
    public function items()       { return $this->hasMany(InvoiceItem::class); }
    public function payments()    { return $this->hasMany(Payment::class); }
}

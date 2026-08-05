<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InvoiceItem extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'invoice_id', 'product_id', 'description', 'month',
        'work_order_id', 'premise_location', 'premise_address',
        'quantity', 'uom', 'uom_conversion',
        'unit_price', 'tax_rate', 'tax_amount', 'subtotal',
    ];

    public function invoice()   { return $this->belongsTo(Invoice::class); }
    public function product()   { return $this->belongsTo(Product::class); }
    public function workOrder() { return $this->belongsTo(WorkOrder::class); }
}

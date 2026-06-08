<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrderItem extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'sales_order_id', 'product_id', 'month', 'parent_product_id',
        'quantity', 'uom', 'uom_conversion', 'visit_frequency',
        'unit_price', 'tax_rate', 'tax_amount', 'subtotal',
    ];

    public function salesOrder() { return $this->belongsTo(SalesOrder::class); }
    public function product() { return $this->belongsTo(Product::class); }
    public function workOrders() { return $this->hasMany(WorkOrder::class); }
}

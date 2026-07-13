<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrderItem extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'purchase_order_id', 'product_id', 'quantity', 'uom_id', 'base_uom_id', 'conversion_factor',
        'tax', 'unit_price', 'base_unit_price', 'subtotal', 'received_qty',
    ];

    protected $casts = [
        'conversion_factor' => 'decimal:6',
    ];

    public function purchaseOrder() { return $this->belongsTo(PurchaseOrder::class); }
    public function product() { return $this->belongsTo(Product::class); }
    public function uom() { return $this->belongsTo(UnitOfMeasure::class, 'uom_id'); }
    public function baseUom() { return $this->belongsTo(UnitOfMeasure::class, 'base_uom_id'); }
    public function receiveItems() { return $this->hasMany(ReceiveItem::class); }
}

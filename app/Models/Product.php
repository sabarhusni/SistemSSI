<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'category_id', 'unit_of_measure_id', 'code', 'name', 'description',
        'internal_note', 'price', 'sales_price', 'cost', 'average_cost', 'unit', 'stock',
        'product_type', 'status',
    ];

    protected $casts = [
        'sales_price' => 'decimal:2',
        'cost'        => 'decimal:2',
        'average_cost' => 'decimal:2',
    ];

    public function category() { return $this->belongsTo(ProductCategory::class); }
    public function unitOfMeasure() { return $this->belongsTo(UnitOfMeasure::class); }
    public function salesOrderItems() { return $this->hasMany(SalesOrderItem::class); }
    public function workOrderMaterials() { return $this->hasMany(WorkOrderMaterial::class); }
    public function stockRecord() { return $this->hasOne(Stock::class); }
    public function purchaseOrderItems() { return $this->hasMany(PurchaseOrderItem::class); }
    public function receiveItems() { return $this->hasMany(ReceiveItem::class); }
}

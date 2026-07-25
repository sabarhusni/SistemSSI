<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrderMaterial extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['work_order_id', 'product_id', 'month', 'parent_product_id', 'uom', 'method_of_application', 'quantity_used'];

    public function workOrder() { return $this->belongsTo(WorkOrder::class); }
    public function product() { return $this->belongsTo(Product::class); }
}

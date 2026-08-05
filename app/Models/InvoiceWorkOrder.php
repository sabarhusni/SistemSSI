<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class InvoiceWorkOrder extends Pivot
{
    use HasUuids;

    protected $table = 'invoice_work_orders';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['invoice_id', 'work_order_id', 'sales_order_id'];

    public function invoice()    { return $this->belongsTo(Invoice::class); }
    public function workOrder()  { return $this->belongsTo(WorkOrder::class); }
    public function salesOrder() { return $this->belongsTo(SalesOrder::class); }
}

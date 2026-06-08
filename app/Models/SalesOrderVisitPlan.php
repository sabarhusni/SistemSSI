<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrderVisitPlan extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'sales_order_id', 'visit_number', 'visit_date', 'quantity',
    ];

    protected $casts = [
        'visit_date' => 'date:Y-m-d',
    ];

    public function salesOrder() { return $this->belongsTo(SalesOrder::class); }
}

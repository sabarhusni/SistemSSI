<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockOpname extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'opname_number', 'warehouse', 'warehouse_id', 'opname_date',
        'conducted_by_id', 'status', 'stock_applied', 'notes',
    ];

    protected $casts = [
        'stock_applied' => 'boolean',
    ];

    public function conductedBy()  { return $this->belongsTo(Employee::class, 'conducted_by_id'); }
    public function warehouseModel() { return $this->belongsTo(Warehouse::class, 'warehouse_id'); }
    public function items()         { return $this->hasMany(StockOpnameItem::class); }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockOpnameItem extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'stock_opname_id', 'product_id',
        'quantity_system', 'quantity_physical', 'difference', 'notes',
    ];

    public function stockOpname() { return $this->belongsTo(StockOpname::class); }
    public function product() { return $this->belongsTo(Product::class); }
}

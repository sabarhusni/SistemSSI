<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockTransfer extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'transfer_number', 'from_warehouse', 'to_warehouse',
        'transfer_date', 'processed_by_id',
        'from_location', 'to_location', 'product_id', 'quantity',
        'status', 'notes', 'created_by',
    ];

    public function processedBy() { return $this->belongsTo(User::class, 'processed_by_id'); }
    public function product() { return $this->belongsTo(Product::class); }
}

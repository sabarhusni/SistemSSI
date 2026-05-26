<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockMovement extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['product_id', 'type', 'quantity', 'reference_id', 'reference_type', 'notes', 'created_by'];

    public function product()   { return $this->belongsTo(Product::class); }
    public function createdBy() { return $this->belongsTo(User::class, 'created_by'); }
}
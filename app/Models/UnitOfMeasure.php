<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UnitOfMeasure extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['name', 'symbol', 'base_uom_id', 'conversion_factor', 'status'];

    protected $casts = [
        'conversion_factor' => 'decimal:6',
    ];

    public function baseUnit() { return $this->belongsTo(UnitOfMeasure::class, 'base_uom_id'); }
    public function derivedUnits() { return $this->hasMany(UnitOfMeasure::class, 'base_uom_id'); }
    public function products() { return $this->hasMany(Product::class); }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Warehouse extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['code', 'type', 'name', 'address', 'phone', 'status'];

    public function stocks()          { return $this->hasMany(Stock::class); }
    public function stockOpnames()    { return $this->hasMany(StockOpname::class); }
    public function stockAdjustments(){ return $this->hasMany(StockAdjustment::class); }
}

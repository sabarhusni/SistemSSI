<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContractService extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id', 'product_id', 'quantity', 'unit_price', 'total_price', 'location',
    ];

    public function contract() { return $this->belongsTo(Contract::class); }
    public function product() { return $this->belongsTo(Product::class); }
    public function subProducts() { return $this->hasMany(ContractServiceSubProduct::class); }
}

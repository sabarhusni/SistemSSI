<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContractServiceSubProduct extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['contract_service_id', 'product_id', 'quantity'];

    public function contractService() { return $this->belongsTo(ContractService::class); }
    public function product() { return $this->belongsTo(Product::class); }
}

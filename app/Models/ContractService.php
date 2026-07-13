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
        'contract_id', 'contract_premise_id', 'product_id', 'uom_id', 'quantity', 'unit_price', 'total_price',
        'tax_rate', 'tax_amount', 'visit_frequency', 'location',
    ];

    public function contract() { return $this->belongsTo(Contract::class); }
    public function premise() { return $this->belongsTo(ContractPremise::class, 'contract_premise_id'); }
    public function product() { return $this->belongsTo(Product::class); }
    public function uom() { return $this->belongsTo(UnitOfMeasure::class, 'uom_id'); }
    public function subProducts() { return $this->hasMany(ContractServiceSubProduct::class); }
}

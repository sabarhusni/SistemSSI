<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContractPremise extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id', 'location', 'address', 'pic', 'phone', 'email', 'visit_frequency', 'sort_order',
    ];

    public function contract() { return $this->belongsTo(Contract::class); }
    public function services() { return $this->hasMany(ContractService::class, 'contract_premise_id'); }
}

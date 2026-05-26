<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContractVisitPlan extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'contract_id', 'visit_number', 'planned_date', 'notes',
    ];

    protected $casts = [
        'planned_date' => 'date',
    ];

    public function contract() { return $this->belongsTo(Contract::class); }
}

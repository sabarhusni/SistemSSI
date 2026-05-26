<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BankTransaction extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'bank_account_id', 'transaction_date', 'type',
        'description', 'amount', 'reference',
        'reconciliation_status', 'notes',
    ];

    public function bankAccount() { return $this->belongsTo(BankAccount::class); }
}

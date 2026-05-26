<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Journal extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'journal_date',
        'description',
        'debit_account_id',
        'credit_account_id',
        'amount',
        'transaction_type',
        'reference_id',
        'reference_type',
        'reference_number',
        'notes',
    ];

    protected $casts = [
        'journal_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function debitAccount()
    {
        return $this->belongsTo(JournalSetting::class, 'debit_account_id');
    }

    public function creditAccount()
    {
        return $this->belongsTo(JournalSetting::class, 'credit_account_id');
    }
}

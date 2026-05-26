<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'invoice_id', 'bank_account_id', 'customer_id', 'payment_number', 'payment_date',
        'amount', 'payment_method', 'reference', 'status', 'notes',
    ];

    public function invoice() { return $this->belongsTo(Invoice::class); }
    public function bankAccount() { return $this->belongsTo(BankAccount::class); }
}

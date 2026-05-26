<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BankAccount extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'bank_name', 'account_number', 'account_name',
        'account_type', 'balance', 'status',
    ];

    public function transactions() { return $this->hasMany(BankTransaction::class); }
    public function payments() { return $this->hasMany(Payment::class); }
}

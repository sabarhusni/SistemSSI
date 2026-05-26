<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JournalSetting extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'account_code',
        'account_name',
        'account_type',
        'account_category',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function debitJournals()
    {
        return $this->hasMany(Journal::class, 'debit_account_id');
    }

    public function creditJournals()
    {
        return $this->hasMany(Journal::class, 'credit_account_id');
    }

    /**
     * Scope untuk aktif accounts saja
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

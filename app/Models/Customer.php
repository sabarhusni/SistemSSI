<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'code', 'name', 'company_name', 'email', 'phone', 'address',
        'city', 'province', 'postal_code', 'status', 'notes',
        'payment_method', 'payment_terms', 'npwp', 'jabatan_kontak',
        'billing_pic_name', 'billing_pic_position', 'billing_pic_email', 'billing_pic_phone', 'billing_pic_address',
    ];

    public function contracts() { return $this->hasMany(Contract::class); }
    public function salesOrders() { return $this->hasMany(SalesOrder::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
}

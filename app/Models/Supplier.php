<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'code', 'name', 'nama_kontak', 'jabatan_kontak', 'npwp',
        'email', 'phone', 'address', 'status', 'notes',
        'payment_method', 'payment_terms',
    ];

    public function purchaseOrders() { return $this->hasMany(PurchaseOrder::class); }
}

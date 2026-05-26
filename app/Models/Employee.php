<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'employee_number', 'name', 'position', 'department',
        'phone', 'email', 'join_date', 'status', 'notes',
    ];

    protected $casts = [
        'join_date' => 'date',
    ];
}

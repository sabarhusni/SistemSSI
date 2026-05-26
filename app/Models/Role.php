<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Role extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['name', 'description'];

    public function users() { return $this->hasMany(User::class); }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'role_permission')
            ->using(RolePermission::class);
    }
}

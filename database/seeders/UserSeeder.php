<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = \App\Models\Role::where('name', 'Admin')->first();
        $managerRole = \App\Models\Role::where('name', 'Manager')->first();
        $salesRole = \App\Models\Role::where('name', 'Sales')->first();
        $technicianRole = \App\Models\Role::where('name', 'Technician')->first();
        $accountantRole = \App\Models\Role::where('name', 'Accountant')->first();
        $warehouseRole = \App\Models\Role::where('name', 'Warehouse')->first();

        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@arum.test',
                'username' => 'admin',
                'password' => bcrypt('password'),
                'role_id' => $adminRole?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Manager',
                'email' => 'manager@arum.test',
                'username' => 'manager',
                'password' => bcrypt('password'),
                'role_id' => $managerRole?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Budi Santoso',
                'email' => 'budi@arum.test',
                'username' => 'budi',
                'password' => bcrypt('password'),
                'role_id' => $salesRole?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Rini Wijaya',
                'email' => 'rini@arum.test',
                'username' => 'rini',
                'password' => bcrypt('password'),
                'role_id' => $technicianRole?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Ahmad Irawan',
                'email' => 'ahmad@arum.test',
                'username' => 'ahmad',
                'password' => bcrypt('password'),
                'role_id' => $technicianRole?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Siti Nurhaliza',
                'email' => 'siti@arum.test',
                'username' => 'siti',
                'password' => bcrypt('password'),
                'role_id' => $accountantRole?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Hendra Kusuma',
                'email' => 'hendra@arum.test',
                'username' => 'hendra',
                'password' => bcrypt('password'),
                'role_id' => $warehouseRole?->id,
                'status' => 'active',
            ],
        ];

        foreach ($users as $user) {
            \App\Models\User::create($user);
        }
    }
}

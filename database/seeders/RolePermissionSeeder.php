<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            ['name' => 'Admin', 'description' => 'Administrator with full access'],
            ['name' => 'Manager', 'description' => 'Manager with most features access'],
            ['name' => 'Sales', 'description' => 'Sales person for managing sales orders'],
            ['name' => 'Technician', 'description' => 'Technician for work orders'],
            ['name' => 'Accountant', 'description' => 'Accountant for financial transactions'],
            ['name' => 'Warehouse', 'description' => 'Warehouse staff for inventory'],
        ];

        foreach ($roles as $role) {
            \App\Models\Role::create($role);
        }

        $permissions = [
            'dashboard.view', 'dashboard.export',
            'customers.list', 'customers.create', 'customers.edit', 'customers.delete',
            'suppliers.list', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
            'products.list', 'products.create', 'products.edit', 'products.delete',
            'contracts.list', 'contracts.create', 'contracts.edit', 'contracts.delete',
            'sales_orders.list', 'sales_orders.create', 'sales_orders.edit', 'sales_orders.delete',
            'work_orders.list', 'work_orders.create', 'work_orders.edit', 'work_orders.delete',
            'invoices.list', 'invoices.create', 'invoices.edit', 'invoices.delete',
            'payments.list', 'payments.create', 'payments.verify',
            'stocks.list', 'stocks.create', 'stocks.edit', 'stocks.transfer', 'stocks.adjust', 'stocks.opname',
            'purchase_orders.list', 'purchase_orders.create', 'purchase_orders.edit',
            'cash_transactions.list', 'cash_transactions.create', 'cash_transactions.edit',
            'bank_transactions.list', 'bank_transactions.create', 'bank_transactions.reconcile',
            'users.list', 'users.create', 'users.edit', 'users.delete',
            'roles.list', 'roles.manage',
        ];

        foreach ($permissions as $perm) {
            \App\Models\Permission::create(['name' => $perm]);
        }

        // Assign semua permission ke role Admin
        $adminRole = \App\Models\Role::where('name', 'Admin')->first();
        if ($adminRole) {
            $allPermissions = \App\Models\Permission::pluck('id');
            $adminRole->permissions()->sync($allPermissions);
        }
    }
}

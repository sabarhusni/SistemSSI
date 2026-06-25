<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        Menu::truncate();

        $menus = [
            // Main
            ['group' => 'Main', 'group_order' => 1, 'label' => 'Dashboard',          'icon' => '📊', 'href' => '/dashboard',             'permission' => 'dashboard.view',          'sort_order' => 1],

            // Operations
            ['group' => 'Operations', 'group_order' => 2, 'label' => 'Customer',            'icon' => '👥', 'href' => '/customers',             'permission' => 'customers.list',          'sort_order' => 1],
            ['group' => 'Operations', 'group_order' => 2, 'label' => 'Supplier',            'icon' => '🏭', 'href' => '/suppliers',             'permission' => 'suppliers.list',          'sort_order' => 2],
            ['group' => 'Operations', 'group_order' => 2, 'label' => 'Product',             'icon' => '📦', 'href' => '/products',              'permission' => 'products.list',           'sort_order' => 3],
            ['group' => 'Operations', 'group_order' => 2, 'label' => 'Unit of Measure',     'icon' => '📐', 'href' => '/unit-of-measures',      'permission' => null,                      'sort_order' => 4],
            ['group' => 'Operations', 'group_order' => 2, 'label' => 'Contract',            'icon' => '📋', 'href' => '/contracts',             'permission' => 'contracts.list',          'sort_order' => 5],
            ['group' => 'Operations', 'group_order' => 2, 'label' => 'Sales Order',         'icon' => '🛒', 'href' => '/sales-orders',          'permission' => 'sales_orders.list',       'sort_order' => 6],
            ['group' => 'Operations', 'group_order' => 2, 'label' => 'Work Service Order',  'icon' => '🔧', 'href' => '/work-orders',           'permission' => 'work_orders.list',        'sort_order' => 7],

            // Finance
            ['group' => 'Finance', 'group_order' => 3, 'label' => 'Invoice',            'icon' => '🧾', 'href' => '/invoices',              'permission' => 'invoices.list',           'sort_order' => 1],
            ['group' => 'Finance', 'group_order' => 3, 'label' => 'Payment',            'icon' => '💳', 'href' => '/payments',              'permission' => 'payments.list',           'sort_order' => 2],
            ['group' => 'Finance', 'group_order' => 3, 'label' => 'Cash In/Out',        'icon' => '💵', 'href' => '/cash-transactions',     'permission' => 'cash_transactions.list',  'sort_order' => 3],
            ['group' => 'Finance', 'group_order' => 3, 'label' => 'Bank In/Out',        'icon' => '🏦', 'href' => '/bank-transactions',     'permission' => 'bank_transactions.list',  'sort_order' => 4],

            // Inventory
            ['group' => 'Inventory', 'group_order' => 4, 'label' => 'Stock',            'icon' => '📦', 'href' => '/stocks',                'permission' => 'stocks.list',             'sort_order' => 1],
            ['group' => 'Inventory', 'group_order' => 4, 'label' => 'Transfer',         'icon' => '🔄', 'href' => '/stock-transfers',       'permission' => 'stocks.transfer',         'sort_order' => 2],
            ['group' => 'Inventory', 'group_order' => 4, 'label' => 'Adjustment',       'icon' => '⚖️',  'href' => '/stock-adjustments',    'permission' => 'stocks.adjust',           'sort_order' => 3],
            ['group' => 'Inventory', 'group_order' => 4, 'label' => 'Stock Opname',     'icon' => '📝', 'href' => '/stock-opnames',         'permission' => 'stocks.opname',           'sort_order' => 4],
            ['group' => 'Inventory', 'group_order' => 4, 'label' => 'Purchase',         'icon' => '🛍️',  'href' => '/purchase-orders',      'permission' => 'purchase_orders.list',    'sort_order' => 5],

            // Reports
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Contract',          'icon' => '📋', 'href' => '/reports/contract',       'permission' => null, 'sort_order' => 1],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Work Order',         'icon' => '🔧', 'href' => '/reports/work-order',     'permission' => null, 'sort_order' => 2],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Sales',             'icon' => '📈', 'href' => '/reports/sales',          'permission' => null, 'sort_order' => 3],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Purchase',          'icon' => '📉', 'href' => '/reports/purchase',       'permission' => null, 'sort_order' => 4],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Stock',             'icon' => '📦', 'href' => '/reports/stock',          'permission' => null, 'sort_order' => 5],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Stock Card',        'icon' => '🗂️',  'href' => '/reports/stock-card',    'permission' => null, 'sort_order' => 6],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Cash Flow',         'icon' => '💹', 'href' => '/reports/cash-flow',      'permission' => null, 'sort_order' => 7],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Cash/Bank Ledger',  'icon' => '📒', 'href' => '/reports/cash-bank-ledger', 'permission' => null, 'sort_order' => 8],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Costs',             'icon' => '💸', 'href' => '/reports/costs',          'permission' => null, 'sort_order' => 9],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Tax (Pajak)',       'icon' => '🧾', 'href' => '/reports/tax',            'permission' => null, 'sort_order' => 10],
            ['group' => 'Reports', 'group_order' => 5, 'label' => 'Incentive',         'icon' => '🎯', 'href' => '/reports/insentif',       'permission' => null, 'sort_order' => 11],

            // HR
            ['group' => 'HR', 'group_order' => 6, 'label' => 'Employee',              'icon' => '🪪', 'href' => '/employees',              'permission' => null, 'sort_order' => 1],

            // Administration
            ['group' => 'Administration', 'group_order' => 7, 'label' => 'User',           'icon' => '👤', 'href' => '/users',                  'permission' => 'users.list',              'sort_order' => 1],
            ['group' => 'Administration', 'group_order' => 7, 'label' => 'Role',           'icon' => '🔑', 'href' => '/roles',                  'permission' => 'roles.list',              'sort_order' => 2],
            ['group' => 'Administration', 'group_order' => 7, 'label' => 'Journal Account','icon' => '📒', 'href' => '/journal-settings',       'permission' => null,                      'sort_order' => 3],
            ['group' => 'Administration', 'group_order' => 7, 'label' => 'Settings',       'icon' => '⚙️',  'href' => '/settings/general',      'permission' => null,                      'sort_order' => 4],
        ];

        foreach ($menus as $menu) {
            Menu::create($menu);
        }
    }
}

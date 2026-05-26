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
            // Utama
            ['group' => 'Utama', 'group_order' => 1, 'label' => 'Dashboard',          'icon' => '📊', 'href' => '/dashboard',             'permission' => 'dashboard.view',          'sort_order' => 1],

            // Operasional
            ['group' => 'Operasional', 'group_order' => 2, 'label' => 'Customer',            'icon' => '👥', 'href' => '/customers',             'permission' => 'customers.list',          'sort_order' => 1],
            ['group' => 'Operasional', 'group_order' => 2, 'label' => 'Supplier',            'icon' => '🏭', 'href' => '/suppliers',             'permission' => 'suppliers.list',          'sort_order' => 2],
            ['group' => 'Operasional', 'group_order' => 2, 'label' => 'Product',             'icon' => '📦', 'href' => '/products',              'permission' => 'products.list',           'sort_order' => 3],
            ['group' => 'Operasional', 'group_order' => 2, 'label' => 'Unit of Measure',     'icon' => '📐', 'href' => '/unit-of-measures',      'permission' => null,                      'sort_order' => 4],
            ['group' => 'Operasional', 'group_order' => 2, 'label' => 'Contract',            'icon' => '📋', 'href' => '/contracts',             'permission' => 'contracts.list',          'sort_order' => 5],
            ['group' => 'Operasional', 'group_order' => 2, 'label' => 'Sales Order',         'icon' => '🛒', 'href' => '/sales-orders',          'permission' => 'sales_orders.list',       'sort_order' => 6],
            ['group' => 'Operasional', 'group_order' => 2, 'label' => 'Work Service Order',  'icon' => '🔧', 'href' => '/work-orders',           'permission' => 'work_orders.list',        'sort_order' => 7],

            // Keuangan
            ['group' => 'Keuangan', 'group_order' => 3, 'label' => 'Invoice',            'icon' => '🧾', 'href' => '/invoices',              'permission' => 'invoices.list',           'sort_order' => 1],
            ['group' => 'Keuangan', 'group_order' => 3, 'label' => 'Payment',            'icon' => '💳', 'href' => '/payments',              'permission' => 'payments.list',           'sort_order' => 2],
            ['group' => 'Keuangan', 'group_order' => 3, 'label' => 'Cash In/Out',        'icon' => '💵', 'href' => '/cash-transactions',     'permission' => 'cash_transactions.list',  'sort_order' => 3],
            ['group' => 'Keuangan', 'group_order' => 3, 'label' => 'Bank In/Out',        'icon' => '🏦', 'href' => '/bank-transactions',     'permission' => 'bank_transactions.list',  'sort_order' => 4],

            // Inventori
            ['group' => 'Inventori', 'group_order' => 4, 'label' => 'Stok',             'icon' => '📦', 'href' => '/stocks',                'permission' => 'stocks.list',             'sort_order' => 1],
            ['group' => 'Inventori', 'group_order' => 4, 'label' => 'Transfer',         'icon' => '🔄', 'href' => '/stock-transfers',       'permission' => 'stocks.transfer',         'sort_order' => 2],
            ['group' => 'Inventori', 'group_order' => 4, 'label' => 'Adjustment',       'icon' => '⚖️',  'href' => '/stock-adjustments',    'permission' => 'stocks.adjust',           'sort_order' => 3],
            ['group' => 'Inventori', 'group_order' => 4, 'label' => 'Opname',           'icon' => '📝', 'href' => '/stock-opnames',         'permission' => 'stocks.opname',           'sort_order' => 4],
            ['group' => 'Inventori', 'group_order' => 4, 'label' => 'Pembelian',        'icon' => '🛍️',  'href' => '/purchase-orders',      'permission' => 'purchase_orders.list',    'sort_order' => 5],

            // Laporan
            ['group' => 'Laporan', 'group_order' => 5, 'label' => 'Sales',             'icon' => '📈', 'href' => '/reports/sales',          'permission' => null, 'sort_order' => 1],
            ['group' => 'Laporan', 'group_order' => 5, 'label' => 'Pembelian',         'icon' => '📉', 'href' => '/reports/purchase',       'permission' => null, 'sort_order' => 2],
            ['group' => 'Laporan', 'group_order' => 5, 'label' => 'Stok',              'icon' => '📦', 'href' => '/reports/stock',          'permission' => null, 'sort_order' => 3],
            ['group' => 'Laporan', 'group_order' => 5, 'label' => 'Kartu Stok',        'icon' => '🗂️',  'href' => '/reports/stock-card',    'permission' => null, 'sort_order' => 4],
            ['group' => 'Laporan', 'group_order' => 5, 'label' => 'Cash Flow',         'icon' => '💹', 'href' => '/reports/cash-flow',      'permission' => null, 'sort_order' => 5],
            ['group' => 'Laporan', 'group_order' => 5, 'label' => 'Buku Kas/Bank',     'icon' => '📒', 'href' => '/reports/cash-bank-ledger', 'permission' => null, 'sort_order' => 6],
            ['group' => 'Laporan', 'group_order' => 5, 'label' => 'Biaya',             'icon' => '💸', 'href' => '/reports/costs',          'permission' => null, 'sort_order' => 7],
            ['group' => 'Laporan', 'group_order' => 5, 'label' => 'Insentif',          'icon' => '🎯', 'href' => '/reports/insentif',       'permission' => null, 'sort_order' => 8],

            // SDM
            ['group' => 'SDM', 'group_order' => 6, 'label' => 'Karyawan',              'icon' => '🪪', 'href' => '/employees',              'permission' => null, 'sort_order' => 1],

            // Administrasi
            ['group' => 'Administrasi', 'group_order' => 7, 'label' => 'Pengguna',     'icon' => '👤', 'href' => '/users',                  'permission' => 'users.list',              'sort_order' => 1],
            ['group' => 'Administrasi', 'group_order' => 7, 'label' => 'Role',         'icon' => '🔑', 'href' => '/roles',                  'permission' => 'roles.list',              'sort_order' => 2],
            ['group' => 'Administrasi', 'group_order' => 7, 'label' => 'Akun Jurnal',  'icon' => '📒', 'href' => '/journal-settings',       'permission' => null,                      'sort_order' => 3],
            ['group' => 'Administrasi', 'group_order' => 7, 'label' => 'Pengaturan',   'icon' => '⚙️',  'href' => '/settings/general',      'permission' => null,                      'sort_order' => 4],
        ];

        foreach ($menus as $menu) {
            Menu::create($menu);
        }
    }
}

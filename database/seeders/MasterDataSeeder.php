<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Product Categories
        $categories = [
            ['name' => 'Pengharum Ruangan', 'description' => 'Produk pengharum ruangan berbagai varian'],
            ['name' => 'Perlengkapan Instalasi', 'description' => 'Peralatan untuk instalasi dan maintenance'],
            ['name' => 'Bahan Kimia', 'description' => 'Bahan baku kimia pendukung'],
        ];

        foreach ($categories as $cat) {
            \App\Models\ProductCategory::create($cat);
        }

        // Products — resolve category UUIDs by name
        $catPengharum = \App\Models\ProductCategory::where('name', 'Pengharum Ruangan')->first()->id;
        $catInstalasi = \App\Models\ProductCategory::where('name', 'Perlengkapan Instalasi')->first()->id;
        $catKimia     = \App\Models\ProductCategory::where('name', 'Bahan Kimia')->first()->id;

        $products = [
            ['category_id' => $catPengharum, 'code' => 'PRD001', 'name' => 'Pengharum Ruangan Aroma Lavender', 'price' => 150000, 'unit' => 'botol'],
            ['category_id' => $catPengharum, 'code' => 'PRD002', 'name' => 'Pengharum Ruangan Aroma Jasmine',  'price' => 150000, 'unit' => 'botol'],
            ['category_id' => $catPengharum, 'code' => 'PRD003', 'name' => 'Pengharum Ruangan Aroma Vanilla',  'price' => 150000, 'unit' => 'botol'],
            ['category_id' => $catInstalasi, 'code' => 'PRD004', 'name' => 'Dispenser Otomatis',               'price' => 500000, 'unit' => 'pcs'],
            ['category_id' => $catInstalasi, 'code' => 'PRD005', 'name' => 'Filter Kertas',                    'price' =>  25000, 'unit' => 'pack'],
            ['category_id' => $catKimia,     'code' => 'PRD006', 'name' => 'Alkohol Pembersih',                'price' =>  50000, 'unit' => 'liter'],
        ];

        foreach ($products as $prod) {
            \App\Models\Product::create($prod);
        }

        // Customers
        $customers = [
            ['code' => 'CUST001', 'name' => 'PT Maju Jaya', 'email' => 'info@majujaya.com', 'phone' => '081234567890', 'address' => 'Jl. Sudirman No. 123', 'city' => 'Jakarta'],
            ['code' => 'CUST002', 'name' => 'Hotel Bintang Lima', 'email' => 'admin@bintanglima.com', 'phone' => '081234567891', 'address' => 'Jl. Gatot Subroto No. 45', 'city' => 'Jakarta'],
            ['code' => 'CUST003', 'name' => 'Kantor Pusat Bank ABC', 'email' => 'facilities@bankabc.com', 'phone' => '081234567892', 'address' => 'Jl. MH. Thamrin No. 78', 'city' => 'Jakarta'],
            ['code' => 'CUST004', 'name' => 'Mall Modern', 'email' => 'maintenance@mallmodern.com', 'phone' => '081234567893', 'address' => 'Jl. Kuningan No. 56', 'city' => 'Jakarta'],
            ['code' => 'CUST005', 'name' => 'Rumah Sakit Mitra', 'email' => 'admin@rumahsakitmitra.com', 'phone' => '081234567894', 'address' => 'Jl. Rasuna Said No. 12', 'city' => 'Jakarta'],
        ];

        foreach ($customers as $cust) {
            \App\Models\Customer::create($cust);
        }

        // Suppliers
        $suppliers = [
            ['code' => 'SUP001', 'name' => 'PT Kimia Industri', 'email' => 'sales@kimiaindustri.com', 'phone' => '0212345678', 'address' => 'Jl. Industri No. 10'],
            ['code' => 'SUP002', 'name' => 'CV Teknologi Terkini', 'email' => 'info@teknologi.com', 'phone' => '0212345679', 'address' => 'Jl. Teknologi No. 20'],
            ['code' => 'SUP003', 'name' => 'PT Logistik Jaya', 'email' => 'supply@logistikjaya.com', 'phone' => '0212345680', 'address' => 'Jl. Logistik No. 30'],
        ];

        foreach ($suppliers as $sup) {
            \App\Models\Supplier::create($sup);
        }

        // Bank Accounts
        $bankAccounts = [
            ['account_number' => '123456789', 'account_name' => 'ARUM - BCA', 'bank_name' => 'Bank Central Asia', 'account_type' => 'Checking'],
            ['account_number' => '987654321', 'account_name' => 'ARUM - Mandiri', 'bank_name' => 'Bank Mandiri', 'account_type' => 'Checking'],
        ];

        foreach ($bankAccounts as $bank) {
            \App\Models\BankAccount::create($bank);
        }
    }
}

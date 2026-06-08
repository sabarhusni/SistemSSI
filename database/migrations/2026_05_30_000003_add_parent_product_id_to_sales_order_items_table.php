<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('sales_order_items', 'parent_product_id')) {
            Schema::table('sales_order_items', function (Blueprint $table) {
                // null = baris service utama; berisi product_id parent = baris sub produk
                $table->uuid('parent_product_id')->nullable()->after('month');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('sales_order_items', 'parent_product_id')) {
            Schema::table('sales_order_items', function (Blueprint $table) {
                $table->dropColumn('parent_product_id');
            });
        }
    }
};

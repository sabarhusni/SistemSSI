<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->integer('month')->default(1)->after('product_id');
            // month + product_id harus unik dalam satu sales order
            $table->unique(['sales_order_id', 'product_id', 'month'], 'so_items_product_month_unique');
        });
    }

    public function down(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropUnique('so_items_product_month_unique');
            $table->dropColumn('month');
        });
    }
};

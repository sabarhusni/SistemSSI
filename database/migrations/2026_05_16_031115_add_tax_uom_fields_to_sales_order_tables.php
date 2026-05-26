<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename service_date → order_date + tambah tax fields di sales_orders
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->renameColumn('service_date', 'order_date');
            $table->decimal('tax_rate',   5,  2)->default(0)->after('total_amount');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('tax_rate');
        });

        // Tambah uom, uom_conversion, tax_rate, tax_amount di sales_order_items
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->string('uom')->nullable()->after('quantity');
            $table->decimal('uom_conversion', 10, 4)->default(1)->after('uom');
            $table->decimal('tax_rate',        5, 2)->default(0)->after('unit_price');
            $table->decimal('tax_amount',     12, 2)->default(0)->after('tax_rate');
        });
    }

    public function down(): void
    {
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->renameColumn('order_date', 'service_date');
            $table->dropColumn(['tax_rate', 'tax_amount']);
        });

        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropColumn(['uom', 'uom_conversion', 'tax_rate', 'tax_amount']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_order_items', 'uom_id')) {
                $table->uuid('uom_id')->nullable()->after('uom');
            }
        });

        $foreignKeys = collect(Schema::getForeignKeys('sales_order_items'))->pluck('name');
        Schema::table('sales_order_items', function (Blueprint $table) use ($foreignKeys) {
            if (!$foreignKeys->contains('sales_order_items_uom_id_foreign')) {
                $table->foreign('uom_id')->references('id')->on('unit_of_measures')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropForeign(['uom_id']);
            $table->dropColumn('uom_id');
        });
    }
};

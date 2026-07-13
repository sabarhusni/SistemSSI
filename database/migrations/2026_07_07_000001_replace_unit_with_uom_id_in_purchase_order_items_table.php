<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_order_items', 'uom_id')) {
                $table->uuid('uom_id')->nullable()->after('quantity');
            }
            if (!Schema::hasColumn('purchase_order_items', 'base_uom_id')) {
                $table->uuid('base_uom_id')->nullable()->after('uom_id');
            }
            if (!Schema::hasColumn('purchase_order_items', 'conversion_factor')) {
                $table->decimal('conversion_factor', 15, 6)->nullable()->after('base_uom_id');
            }
            if (!Schema::hasColumn('purchase_order_items', 'base_unit_price')) {
                $table->decimal('base_unit_price', 15, 2)->nullable()->after('unit_price');
            }
            if (!Schema::hasColumn('purchase_order_items', 'tax')) {
                $table->decimal('tax', 5, 2)->nullable()->after('base_unit_price');
            }
        });

        $foreignKeys = collect(Schema::getForeignKeys('purchase_order_items'))->pluck('name');
        Schema::table('purchase_order_items', function (Blueprint $table) use ($foreignKeys) {
            if (!$foreignKeys->contains('purchase_order_items_uom_id_foreign')) {
                $table->foreign('uom_id')->references('id')->on('unit_of_measures')->onDelete('set null');
            }
            if (!$foreignKeys->contains('purchase_order_items_base_uom_id_foreign')) {
                $table->foreign('base_uom_id')->references('id')->on('unit_of_measures')->onDelete('set null');
            }
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_order_items', 'unit')) {
                $table->dropColumn('unit');
            }
            if (Schema::hasColumn('purchase_order_items', 'pph')) {
                $table->dropColumn('pph');
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->string('unit')->nullable()->after('quantity');
            $table->decimal('pph', 5, 2)->nullable()->after('unit');
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropForeign(['uom_id']);
            $table->dropForeign(['base_uom_id']);
            $table->dropColumn(['uom_id', 'base_uom_id', 'conversion_factor', 'base_unit_price', 'tax']);
        });
    }
};

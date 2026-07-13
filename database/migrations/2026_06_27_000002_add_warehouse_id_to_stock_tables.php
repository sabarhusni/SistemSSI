<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->uuid('warehouse_id')->nullable()->after('product_id');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
        });

        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->uuid('from_warehouse_id')->nullable()->after('to_warehouse');
            $table->uuid('to_warehouse_id')->nullable()->after('from_warehouse_id');
            $table->foreign('from_warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
            $table->foreign('to_warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
        });

        Schema::table('stock_opnames', function (Blueprint $table) {
            $table->uuid('warehouse_id')->nullable()->after('warehouse');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
        });

        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->uuid('warehouse_id')->nullable()->after('product_id');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn('warehouse_id');
        });

        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropForeign(['from_warehouse_id']);
            $table->dropForeign(['to_warehouse_id']);
            $table->dropColumn(['from_warehouse_id', 'to_warehouse_id']);
        });

        Schema::table('stock_opnames', function (Blueprint $table) {
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn('warehouse_id');
        });

        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn('warehouse_id');
        });
    }
};

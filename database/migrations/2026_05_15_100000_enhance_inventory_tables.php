<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('transfer_number')->unique()->nullable()->after('id');
            $table->date('transfer_date')->nullable()->after('transfer_number');
            $table->string('from_warehouse')->nullable()->after('transfer_date');
            $table->string('to_warehouse')->nullable()->after('from_warehouse');
            $table->uuid('processed_by_id')->nullable()->after('to_warehouse');
            $table->foreign('processed_by_id')->references('id')->on('users')->onDelete('set null');
        });

        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->string('adjustment_number')->unique()->nullable()->after('id');
            $table->date('adjustment_date')->nullable()->after('adjustment_number');
            $table->string('type')->nullable()->after('adjustment_date');
            $table->integer('quantity_adjusted')->nullable()->after('type');
            $table->integer('quantity_before')->nullable()->after('quantity_adjusted');
            $table->integer('quantity_after')->nullable()->after('quantity_before');
        });

        Schema::table('stock_opnames', function (Blueprint $table) {
            $table->string('warehouse')->nullable()->after('opname_number');
            $table->uuid('conducted_by_id')->nullable()->after('warehouse');
            $table->foreign('conducted_by_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropColumn(['transfer_number', 'transfer_date', 'from_warehouse', 'to_warehouse', 'processed_by_id']);
        });
        Schema::table('stock_adjustments', function (Blueprint $table) {
            $table->dropColumn(['adjustment_number', 'adjustment_date', 'type', 'quantity_adjusted', 'quantity_before', 'quantity_after']);
        });
        Schema::table('stock_opnames', function (Blueprint $table) {
            $table->dropColumn(['warehouse', 'conducted_by_id']);
        });
    }
};

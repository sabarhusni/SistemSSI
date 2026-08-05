<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('invoices', 'sales_order_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropForeign(['sales_order_id']);
                $table->dropColumn('sales_order_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->uuid('sales_order_id')->nullable()->after('id');
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoice_work_orders', function (Blueprint $table) {
            $table->uuid('sales_order_id')->nullable()->after('work_order_id');
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
        });

        DB::table('invoice_work_orders')->update([
            'sales_order_id' => DB::raw('(select sales_order_id from work_orders where work_orders.id = invoice_work_orders.work_order_id)'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_work_orders', function (Blueprint $table) {
            $table->dropForeign(['sales_order_id']);
            $table->dropColumn('sales_order_id');
        });
    }
};

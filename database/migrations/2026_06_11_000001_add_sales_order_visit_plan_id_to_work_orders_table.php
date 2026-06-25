<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('work_orders', 'sales_order_visit_plan_id')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->uuid('sales_order_visit_plan_id')->nullable()->after('sales_order_item_id');
                $table->foreign('sales_order_visit_plan_id')->references('id')->on('sales_order_visit_plans')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('work_orders', 'sales_order_visit_plan_id')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->dropForeign(['sales_order_visit_plan_id']);
                $table->dropColumn('sales_order_visit_plan_id');
            });
        }
    }
};

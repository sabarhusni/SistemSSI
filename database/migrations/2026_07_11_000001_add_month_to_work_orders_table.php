<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('work_orders', 'month')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->unsignedInteger('month')->nullable()->after('sales_order_visit_plan_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('work_orders', 'month')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->dropColumn('month');
            });
        }
    }
};

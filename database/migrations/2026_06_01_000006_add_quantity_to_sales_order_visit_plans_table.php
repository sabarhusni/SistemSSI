<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_order_visit_plans', function (Blueprint $table) {
            $table->decimal('quantity', 12, 2)->nullable()->after('visit_date');
        });
    }

    public function down(): void
    {
        Schema::table('sales_order_visit_plans', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }
};

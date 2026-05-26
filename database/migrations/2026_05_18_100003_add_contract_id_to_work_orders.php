<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->uuid('contract_id')->nullable()->after('sales_order_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('set null');

            // Make technician nullable so WOs can be auto-generated before assignment
            $table->uuid('technician_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['contract_id']);
            $table->dropColumn('contract_id');
            $table->uuid('technician_id')->nullable(false)->change();
        });
    }
};

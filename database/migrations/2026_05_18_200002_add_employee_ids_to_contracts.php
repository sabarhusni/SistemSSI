<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->uuid('sales_employee_id')->nullable()->after('lead_name');
            $table->uuid('lead_employee_id')->nullable()->after('sales_employee_id');
            $table->foreign('sales_employee_id')->references('id')->on('employees')->onDelete('set null');
            $table->foreign('lead_employee_id')->references('id')->on('employees')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropForeign(['sales_employee_id']);
            $table->dropForeign(['lead_employee_id']);
            $table->dropColumn(['sales_employee_id', 'lead_employee_id']);
        });
    }
};

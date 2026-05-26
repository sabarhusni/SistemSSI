<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->integer('invoice_frequency')->default(1)->after('visit_frequency_unit');
            $table->enum('sales_type', ['canvas', 'lead'])->nullable()->after('notes');
            $table->string('sales_name')->nullable()->after('sales_type');
            $table->string('lead_name')->nullable()->after('sales_name');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn(['invoice_frequency', 'sales_type', 'sales_name', 'lead_name']);
        });
    }
};

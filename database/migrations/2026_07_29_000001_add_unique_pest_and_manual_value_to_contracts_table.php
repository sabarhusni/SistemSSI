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
        Schema::table('contracts', function (Blueprint $table) {
            $table->boolean('is_unique_pest')->default(false)->after('service_type');
            $table->boolean('is_manual_contract_value')->default(false)->after('contract_value');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn(['is_unique_pest', 'is_manual_contract_value']);
        });
    }
};

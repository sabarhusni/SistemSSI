<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contract_services', function (Blueprint $table) {
            $table->uuid('contract_premise_id')->nullable()->after('contract_id');
            $table->integer('visit_frequency')->nullable()->after('tax_amount');
            $table->foreign('contract_premise_id')->references('id')->on('contract_premises')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('contract_services', function (Blueprint $table) {
            $table->dropForeign(['contract_premise_id']);
            $table->dropColumn(['contract_premise_id', 'visit_frequency']);
        });
    }
};

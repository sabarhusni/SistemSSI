<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn(['service_area', 'visit_frequency', 'visit_frequency_unit']);
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->string('service_area')->nullable();
            $table->integer('visit_frequency')->default(1);
            $table->string('visit_frequency_unit')->default('month');
        });
    }
};

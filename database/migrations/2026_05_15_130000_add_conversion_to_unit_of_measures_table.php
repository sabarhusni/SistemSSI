<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_of_measures', function (Blueprint $table) {
            $table->uuid('base_uom_id')->nullable()->after('symbol');
            $table->decimal('conversion_factor', 18, 6)->default(1)->after('base_uom_id');
            $table->foreign('base_uom_id')->references('id')->on('unit_of_measures')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('unit_of_measures', function (Blueprint $table) {
            $table->dropForeign(['base_uom_id']);
            $table->dropColumn(['base_uom_id', 'conversion_factor']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('sales_price', 12, 2)->default(0)->after('price');
            $table->decimal('cost', 12, 2)->default(0)->after('sales_price');
            $table->text('internal_note')->nullable()->after('description');
            $table->enum('product_type', ['goods', 'service'])->default('goods')->after('status');
            $table->uuid('unit_of_measure_id')->nullable()->after('unit');
            $table->foreign('unit_of_measure_id')->references('id')->on('unit_of_measures')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['unit_of_measure_id']);
            $table->dropColumn(['sales_price', 'cost', 'internal_note', 'product_type', 'unit_of_measure_id']);
        });
    }
};

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
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->uuid('work_order_id')->nullable()->after('product_id');
            $table->string('premise_location')->nullable()->after('work_order_id');
            $table->string('premise_address')->nullable()->after('premise_location');

            $table->foreign('work_order_id')->references('id')->on('work_orders')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropForeign(['work_order_id']);
            $table->dropColumn(['work_order_id', 'premise_location', 'premise_address']);
        });
    }
};

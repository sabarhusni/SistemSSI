<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->string('unit')->nullable()->after('quantity');
            $table->decimal('pph', 5, 2)->nullable()->after('unit');
            $table->integer('received_qty')->default(0)->after('pph');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropColumn(['unit', 'pph', 'received_qty']);
        });
    }
};

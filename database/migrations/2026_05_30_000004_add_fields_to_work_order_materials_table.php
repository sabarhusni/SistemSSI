<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_order_materials', function (Blueprint $table) {
            if (!Schema::hasColumn('work_order_materials', 'month')) {
                $table->integer('month')->default(1)->after('product_id');
            }
            if (!Schema::hasColumn('work_order_materials', 'parent_product_id')) {
                // null = baris product utama; berisi product_id parent = baris sub product
                $table->uuid('parent_product_id')->nullable()->after('month');
            }
            if (!Schema::hasColumn('work_order_materials', 'uom')) {
                $table->string('uom')->nullable()->after('parent_product_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('work_order_materials', function (Blueprint $table) {
            $table->dropColumn(['month', 'parent_product_id', 'uom']);
        });
    }
};

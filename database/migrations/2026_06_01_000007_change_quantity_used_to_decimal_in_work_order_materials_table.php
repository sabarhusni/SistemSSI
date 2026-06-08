<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Qty material WO bisa pecahan setelah dibagi per tanggal visit, jadi
     * ubah dari integer ke decimal.
     */
    public function up(): void
    {
        Schema::table('work_order_materials', function (Blueprint $table) {
            $table->decimal('quantity_used', 12, 2)->default(1)->change();
        });
    }

    public function down(): void
    {
        Schema::table('work_order_materials', function (Blueprint $table) {
            $table->integer('quantity_used')->default(1)->change();
        });
    }
};

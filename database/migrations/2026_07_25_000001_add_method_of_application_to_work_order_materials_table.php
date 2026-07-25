<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_order_materials', function (Blueprint $table) {
            $table->string('method_of_application')->nullable()->after('uom');
        });
    }

    public function down(): void
    {
        Schema::table('work_order_materials', function (Blueprint $table) {
            $table->dropColumn('method_of_application');
        });
    }
};

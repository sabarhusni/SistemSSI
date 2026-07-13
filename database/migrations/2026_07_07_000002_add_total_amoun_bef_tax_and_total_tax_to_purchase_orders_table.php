<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_orders', 'total_amoun_bef_tax')) {
                $table->decimal('total_amoun_bef_tax', 15, 2)->nullable()->after('total_amount');
            }
            if (!Schema::hasColumn('purchase_orders', 'total_tax')) {
                $table->decimal('total_tax', 15, 2)->nullable()->after('total_amoun_bef_tax');
            }
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['total_amoun_bef_tax', 'total_tax']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->text('billing_pic_address')->nullable();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->text('billing_pic_address')->nullable()->after('billing_pic_phone');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('billing_pic_address');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('billing_pic_address');
        });
    }
};

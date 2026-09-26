<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('billing_pic_name')->nullable();
            $table->string('billing_pic_position', 100)->nullable();
            $table->string('billing_pic_email')->nullable();
            $table->string('billing_pic_phone', 50)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['billing_pic_name', 'billing_pic_position', 'billing_pic_email', 'billing_pic_phone']);
        });
    }
};

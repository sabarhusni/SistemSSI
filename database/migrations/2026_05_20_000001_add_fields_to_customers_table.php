<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('payment_method')->nullable()->after('notes');
            $table->string('payment_terms')->nullable()->after('payment_method');
            $table->string('npwp')->nullable()->after('payment_terms');
            $table->string('jabatan_kontak')->nullable()->after('npwp');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'payment_terms', 'npwp', 'jabatan_kontak']);
        });
    }
};

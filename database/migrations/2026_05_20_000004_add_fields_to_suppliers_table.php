<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('nama_kontak')->nullable()->after('name');
            $table->string('jabatan_kontak')->nullable()->after('nama_kontak');
            $table->string('npwp')->nullable()->after('jabatan_kontak');
            $table->string('payment_method')->nullable()->after('notes');
            $table->string('payment_terms')->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn(['nama_kontak', 'jabatan_kontak', 'npwp', 'payment_method', 'payment_terms']);
        });
    }
};

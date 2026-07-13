<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Hapus data lama agar tidak melanggar FK baru ke tabel employees
        DB::table('work_orders')->update(['technician_id' => null]);
        DB::table('stock_transfers')->update(['processed_by_id' => null]);
        DB::table('stock_opnames')->update(['conducted_by_id' => null]);

        // work_orders.technician_id: drop FK ke users, buat nullable, tambah FK ke employees
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['technician_id']);
            $table->uuid('technician_id')->nullable()->change();
            $table->foreign('technician_id')->references('id')->on('employees')->onDelete('set null');
        });

        // stock_transfers.processed_by_id: drop FK ke users, tambah FK ke employees
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropForeign(['processed_by_id']);
            $table->foreign('processed_by_id')->references('id')->on('employees')->onDelete('set null');
        });

        // stock_opnames.conducted_by_id: drop FK ke users, tambah FK ke employees
        Schema::table('stock_opnames', function (Blueprint $table) {
            $table->dropForeign(['conducted_by_id']);
            $table->foreign('conducted_by_id')->references('id')->on('employees')->onDelete('set null');
        });
    }

    public function down(): void
    {
        DB::table('work_orders')->update(['technician_id' => null]);
        DB::table('stock_transfers')->update(['processed_by_id' => null]);
        DB::table('stock_opnames')->update(['conducted_by_id' => null]);

        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropForeign(['technician_id']);
            $table->foreign('technician_id')->references('id')->on('users')->onDelete('set null');
        });

        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropForeign(['processed_by_id']);
            $table->foreign('processed_by_id')->references('id')->on('users')->onDelete('set null');
        });

        Schema::table('stock_opnames', function (Blueprint $table) {
            $table->dropForeign(['conducted_by_id']);
            $table->foreign('conducted_by_id')->references('id')->on('users')->onDelete('set null');
        });
    }
};

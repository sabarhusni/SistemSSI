<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ubah status enum payments ke varchar agar fleksibel, dan tambah bank_account_id
        DB::statement("ALTER TABLE payments ALTER COLUMN status TYPE varchar(20) USING status::text");
        DB::statement("ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'received'");
        DB::statement("UPDATE payments SET status = 'received' WHERE status = 'pending'");

        Schema::table('payments', function (Blueprint $table) {
            $table->uuid('bank_account_id')->nullable()->after('invoice_id');
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('set null');
            $table->uuid('customer_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['bank_account_id']);
            $table->dropColumn('bank_account_id');
        });
    }
};

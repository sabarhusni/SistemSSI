<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('customer_name')->nullable()->after('customer_id');
        });

        // Isi nama customer untuk invoice lama dari master customer.
        DB::statement('UPDATE invoices SET customer_name = customers.name FROM customers WHERE invoices.customer_id = customers.id AND invoices.customer_name IS NULL');
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('customer_name');
        });
    }
};

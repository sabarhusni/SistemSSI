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
            $table->string('billing_pic_name')->nullable()->after('customer_name');
            $table->string('billing_pic_position', 100)->nullable()->after('billing_pic_name');
            $table->string('billing_pic_email')->nullable()->after('billing_pic_position');
            $table->string('billing_pic_phone', 50)->nullable()->after('billing_pic_email');
        });

        // Isi PIC penagihan invoice lama dari master customer.
        DB::statement('UPDATE invoices SET billing_pic_name = customers.billing_pic_name, billing_pic_position = customers.billing_pic_position, billing_pic_email = customers.billing_pic_email, billing_pic_phone = customers.billing_pic_phone FROM customers WHERE invoices.customer_id = customers.id');
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['billing_pic_name', 'billing_pic_position', 'billing_pic_email', 'billing_pic_phone']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->uuid('contract_id')->nullable()->after('id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('set null');
            $table->uuid('customer_id')->nullable()->change();
            $table->decimal('tax_rate', 5, 2)->default(0)->after('due_date');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->renameColumn('amount', 'subtotal');
            $table->string('uom')->nullable()->after('quantity');
            $table->decimal('uom_conversion', 10, 4)->default(1)->after('uom');
            $table->decimal('tax_rate',   5,  2)->default(0)->after('unit_price');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('tax_rate');
            $table->string('description')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['contract_id']);
            $table->dropColumn(['contract_id', 'tax_rate']);
            $table->uuid('customer_id')->nullable(false)->change();
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->renameColumn('subtotal', 'amount');
            $table->dropColumn(['uom', 'uom_conversion', 'tax_rate', 'tax_amount']);
            $table->string('description')->nullable(false)->change();
        });
    }
};

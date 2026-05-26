<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('journals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('journal_date');
            $table->string('description')->nullable();
            $table->uuid('debit_account_id')->nullable(); // reference to journal_settings
            $table->uuid('credit_account_id')->nullable(); // reference to journal_settings
            $table->decimal('amount', 15, 2);
            $table->string('transaction_type'); // purchase, receive, sales, payment, etc.
            $table->uuid('reference_id')->nullable(); // PO ID, Receive ID, Invoice ID, etc.
            $table->string('reference_type')->nullable(); // PurchaseOrder, ReceiveItem, Invoice, etc.
            $table->string('reference_number')->nullable(); // PO number, SO number, etc.
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->index('journal_date');
            $table->index('transaction_type');
            $table->index('reference_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journals');
    }
};

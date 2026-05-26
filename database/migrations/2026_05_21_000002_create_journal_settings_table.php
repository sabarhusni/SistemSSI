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
        Schema::create('journal_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('account_code')->unique(); // e.g., 1000, 2000, 3000
            $table->string('account_name'); // e.g., Inventory, Accounts Payable
            $table->enum('account_type', ['asset', 'liability', 'equity', 'revenue', 'expense']); // Account type
            $table->enum('account_category', ['current', 'fixed'])->nullable(); // For assets
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('account_code');
            $table->index('account_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_settings');
    }
};

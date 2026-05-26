<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contract_services', function (Blueprint $table) {
            $table->enum('location', ['routine', 'complaint', 'followup'])->nullable()->after('total_price');
        });

        Schema::create('contract_service_sub_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('contract_service_id');
            $table->uuid('product_id');
            $table->integer('quantity')->default(1);
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('contract_service_id')->references('id')->on('contract_services')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_service_sub_products');
        Schema::table('contract_services', function (Blueprint $table) {
            $table->dropColumn('location');
        });
    }
};

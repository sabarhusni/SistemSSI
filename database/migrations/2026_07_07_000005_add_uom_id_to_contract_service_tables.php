<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contract_services', function (Blueprint $table) {
            if (!Schema::hasColumn('contract_services', 'uom_id')) {
                $table->uuid('uom_id')->nullable()->after('product_id');
            }
        });

        Schema::table('contract_service_sub_products', function (Blueprint $table) {
            if (!Schema::hasColumn('contract_service_sub_products', 'uom_id')) {
                $table->uuid('uom_id')->nullable()->after('product_id');
            }
        });

        $serviceForeignKeys = collect(Schema::getForeignKeys('contract_services'))->pluck('name');
        Schema::table('contract_services', function (Blueprint $table) use ($serviceForeignKeys) {
            if (!$serviceForeignKeys->contains('contract_services_uom_id_foreign')) {
                $table->foreign('uom_id')->references('id')->on('unit_of_measures')->onDelete('set null');
            }
        });

        $subProductForeignKeys = collect(Schema::getForeignKeys('contract_service_sub_products'))->pluck('name');
        Schema::table('contract_service_sub_products', function (Blueprint $table) use ($subProductForeignKeys) {
            if (!$subProductForeignKeys->contains('contract_service_sub_products_uom_id_foreign')) {
                $table->foreign('uom_id')->references('id')->on('unit_of_measures')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('contract_services', function (Blueprint $table) {
            $table->dropForeign(['uom_id']);
            $table->dropColumn('uom_id');
        });

        Schema::table('contract_service_sub_products', function (Blueprint $table) {
            $table->dropForeign(['uom_id']);
            $table->dropColumn('uom_id');
        });
    }
};

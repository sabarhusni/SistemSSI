<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'unit')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('unit')->nullable()->after('product_type');
            });

            // Isi unit dari simbol UoM bila ada, jika tidak gunakan default 'pcs'.
            DB::statement(
                "UPDATE products
                 SET unit = COALESCE(
                     (SELECT symbol FROM unit_of_measures u WHERE u.id = products.unit_of_measure_id),
                     'pcs'
                 )"
            );
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('products', 'unit')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('unit');
            });
        }
    }
};

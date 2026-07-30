<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Index unik lama (sales_order_id, product_id, month) tidak menyertakan
     * parent_product_id, sehingga produk yang sama tidak bisa dipakai sebagai
     * sub-produk pada lebih dari satu Service Item dalam bulan yang sama —
     * baris keduanya bentrok dengan baris pertama. Dipecah jadi dua partial
     * unique index: satu untuk baris parent (parent_product_id NULL), satu
     * lagi untuk baris sub-produk yang menyertakan parent_product_id di key.
     */
    public function up(): void
    {
        DB::statement('DROP INDEX IF EXISTS so_items_product_month_unique');

        DB::statement('
            CREATE UNIQUE INDEX so_items_parent_product_month_unique
            ON sales_order_items (sales_order_id, product_id, month)
            WHERE deleted_at IS NULL AND parent_product_id IS NULL
        ');

        DB::statement('
            CREATE UNIQUE INDEX so_items_sub_product_month_unique
            ON sales_order_items (sales_order_id, product_id, parent_product_id, month)
            WHERE deleted_at IS NULL AND parent_product_id IS NOT NULL
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS so_items_parent_product_month_unique');
        DB::statement('DROP INDEX IF EXISTS so_items_sub_product_month_unique');

        DB::statement('
            CREATE UNIQUE INDEX so_items_product_month_unique
            ON sales_order_items (sales_order_id, product_id, month)
            WHERE deleted_at IS NULL
        ');
    }
};

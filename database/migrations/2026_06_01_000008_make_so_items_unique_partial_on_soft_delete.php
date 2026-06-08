<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Saat update SO, item lama di-soft-delete (untuk menjaga referensi Work Order)
     * lalu item baru dibuat ulang. Unique index lama ikut menghitung baris yang
     * sudah di-soft-delete sehingga insert (sales_order_id, product_id, month) yang
     * sama bentrok. Ubah jadi partial unique index yang hanya berlaku untuk baris
     * aktif (deleted_at IS NULL).
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE sales_order_items DROP CONSTRAINT IF EXISTS so_items_product_month_unique');
        DB::statement('DROP INDEX IF EXISTS so_items_product_month_unique');
        DB::statement('CREATE UNIQUE INDEX so_items_product_month_unique ON sales_order_items (sales_order_id, product_id, month) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS so_items_product_month_unique');
        DB::statement('CREATE UNIQUE INDEX so_items_product_month_unique ON sales_order_items (sales_order_id, product_id, month)');
    }
};

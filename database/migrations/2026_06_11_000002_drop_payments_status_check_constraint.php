<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Status payments dulu enum ['pending','verified','rejected'] sehingga membentuk
     * CHECK constraint. Migrasi sebelumnya mengubah kolom ke varchar ('received' dst.)
     * tapi tidak menghapus constraint lama, sehingga insert status 'received' gagal.
     * Hapus constraint agar nilai status fleksibel (divalidasi di controller).
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check');
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN ('pending', 'verified', 'rejected'))");
    }
};

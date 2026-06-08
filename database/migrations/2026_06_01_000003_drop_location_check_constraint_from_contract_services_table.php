<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Saat kolom `location` diubah dari enum menjadi string (migrasi 2026_05_15_130001),
     * CHECK constraint warisan enum tidak ikut terhapus di PostgreSQL, sehingga nilai
     * bebas (keterangan lokasi) ditolak. Hapus constraint tersebut.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE contract_services DROP CONSTRAINT IF EXISTS contract_services_location_check');
    }

    public function down(): void
    {
        // Tidak dipulihkan: kolom kini bertipe string bebas.
    }
};

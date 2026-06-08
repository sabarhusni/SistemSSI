<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Visit frequency dipindahkan dari level produk (contract_services) ke
     * level premis (contract_premises): satu frekuensi kunjungan per lokasi.
     */
    public function up(): void
    {
        Schema::table('contract_premises', function (Blueprint $table) {
            $table->integer('visit_frequency')->nullable()->after('email');
        });

        // Bawa nilai lama dari salah satu service per premis (jika ada) sebagai default.
        DB::statement(<<<'SQL'
            UPDATE contract_premises cp
            SET visit_frequency = sub.vf
            FROM (
                SELECT contract_premise_id, MAX(visit_frequency) AS vf
                FROM contract_services
                WHERE contract_premise_id IS NOT NULL AND visit_frequency IS NOT NULL
                GROUP BY contract_premise_id
            ) sub
            WHERE cp.id = sub.contract_premise_id
        SQL);
    }

    public function down(): void
    {
        Schema::table('contract_premises', function (Blueprint $table) {
            $table->dropColumn('visit_frequency');
        });
    }
};

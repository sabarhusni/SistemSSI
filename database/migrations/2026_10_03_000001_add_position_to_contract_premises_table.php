<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contract_premises', function (Blueprint $table) {
            // Jabatan PIC premis, ditampilkan pada print kontrak.
            $table->string('position', 100)->nullable()->after('pic');
        });
    }

    public function down(): void
    {
        Schema::table('contract_premises', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }
};

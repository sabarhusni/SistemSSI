<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Kontrak yang sempat tersimpan dengan nilai label 'U-Scent' dikembalikan ke nilai internal 'scenting'.
        DB::table('contracts')->where('service_type', 'U-Scent')->update(['service_type' => 'scenting']);
    }

    public function down(): void
    {
        //
    }
};

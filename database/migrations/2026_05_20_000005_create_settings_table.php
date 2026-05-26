<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Seed default values
        DB::table('settings')->insert([
            ['key' => 'tax_type',    'value' => 'exclude', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'tax_rate_po', 'value' => '11',      'created_at' => now(), 'updated_at' => now()],
            ['key' => 'tax_rate_so', 'value' => '11',      'created_at' => now(), 'updated_at' => now()],
            ['key' => 'company_name','value' => '',         'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};

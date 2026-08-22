<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE books MODIFY period_type ENUM('monthly','quarterly','semiannual','yearly') NOT NULL DEFAULT 'monthly'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE books MODIFY period_type ENUM('monthly') NOT NULL DEFAULT 'monthly'");
    }
};
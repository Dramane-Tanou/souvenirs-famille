<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE orders MODIFY format ENUM('softcover','hardcover','pdf') NOT NULL");
        DB::statement("ALTER TABLE orders MODIFY delivery_address TEXT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE orders MODIFY format ENUM('softcover','hardcover') NOT NULL");
        DB::statement("ALTER TABLE orders MODIFY delivery_address TEXT NOT NULL");
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('email', 'tanoudramane17@gmail.com')
            ->update(['is_admin' => true, 'is_super_admin' => true]);
    }

    public function down(): void
    {
        DB::table('users')
            ->where('email', 'tanoudramane17@gmail.com')
            ->update(['is_admin' => false, 'is_super_admin' => false]);
    }
};

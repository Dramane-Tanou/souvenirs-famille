<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_root_super_admin')->default(false)->after('is_super_admin');
        });

        // Le compte super-admin déjà en place devient le super-admin racine,
        // protégé contre toute rétrogradation par les super-admins qu'il nommera.
        DB::table('users')
            ->where('is_super_admin', true)
            ->update(['is_root_super_admin' => true]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_root_super_admin');
        });
    }
};

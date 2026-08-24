<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Code pays ISO 3166-1 alpha-2 (ex. "CH", "BF") plutôt que le nom
            // complet, pour rester cohérent avec le code déjà utilisé par
            // App\Support\GeoCurrency (détection par IP côté inscription).
            $table->string('country', 2)->nullable()->after('gender');
            $table->string('city')->nullable()->after('country');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['country', 'city']);
        });
    }
};

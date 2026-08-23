<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Autorise un deuxième livre sur la même période s'il a une orientation
     * différente (portrait vs paysage) — jusqu'ici la contrainte d'unicité
     * ignorait l'orientation et bloquait ce cas légitime.
     */
    public function up(): void
    {
        // Ajoute d'abord le nouvel index unique, puis retire l'ancien — les
        // deux partagent `family_id` en tête, donc la contrainte de clé
        // étrangère sur cette colonne reste toujours couverte par au moins un
        // index pendant la transition (MySQL refuse de retirer un index tant
        // qu'aucun autre ne couvre la même clé étrangère).
        Schema::table('books', function (Blueprint $table) {
            $table->unique(['family_id', 'period_start', 'period_end', 'orientation']);
        });
        Schema::table('books', function (Blueprint $table) {
            $table->dropUnique(['family_id', 'period_start', 'period_end']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->unique(['family_id', 'period_start', 'period_end']);
        });
        Schema::table('books', function (Blueprint $table) {
            $table->dropUnique(['family_id', 'period_start', 'period_end', 'orientation']);
        });
    }
};

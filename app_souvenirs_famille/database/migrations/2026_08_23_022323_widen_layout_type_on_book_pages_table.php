<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Élargit layout_type (enum à 4 valeurs figées) en varchar pour accueillir
     * le nouveau catalogue d'une dizaine de mises en page (App\Support\BookLayouts),
     * et migre les anciennes valeurs vers leurs équivalents directs.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE book_pages MODIFY layout_type VARCHAR(30) NOT NULL');

        DB::table('book_pages')->where('layout_type', 'one')->update(['layout_type' => 'solo']);
        DB::table('book_pages')->where('layout_type', 'two')->update(['layout_type' => 'duo_vertical']);
        DB::table('book_pages')->where('layout_type', 'three')->update(['layout_type' => 'trio_hero_left']);
        DB::table('book_pages')->where('layout_type', 'four')->update(['layout_type' => 'quad_grid']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('book_pages')->where('layout_type', 'solo')->update(['layout_type' => 'one']);
        DB::table('book_pages')->where('layout_type', 'duo_vertical')->update(['layout_type' => 'two']);
        DB::table('book_pages')->whereIn('layout_type', ['duo_horizontal'])->update(['layout_type' => 'two']);
        DB::table('book_pages')->whereIn('layout_type', ['trio_hero_left', 'trio_hero_top', 'strip_three'])->update(['layout_type' => 'three']);
        DB::table('book_pages')->whereIn('layout_type', ['quad_grid', 'quad_hero', 'strip_four'])->update(['layout_type' => 'four']);
        DB::table('book_pages')->whereIn('layout_type', ['quintet_mosaic', 'sextet_grid'])->update(['layout_type' => 'four']);

        DB::statement("ALTER TABLE book_pages MODIFY layout_type ENUM('one','two','three','four') NOT NULL");
    }
};

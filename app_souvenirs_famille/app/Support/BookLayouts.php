<?php

namespace App\Support;

/**
 * Catalogue des mises en page disponibles pour une page de livre — combien de
 * photos elle accueille, et comment. Utilisé pour tirer au sort une mise en
 * page adaptée au nombre de photos restantes lors de la composition d'un
 * livre (App\Http\Controllers\Api\BookController::layoutBookRandomly).
 *
 * Le rendu concret (table HTML pour le PDF, grille CSS pour l'aperçu web) est
 * codé séparément dans resources/views/book-pdf.blade.php et
 * src/components/BookPagePreview.tsx — les deux DOIVENT rester visuellement
 * cohérents avec ce catalogue.
 */
class BookLayouts
{
    /**
     * Mises en page groupées par nombre de photos qu'elles accueillent.
     */
    public static function byPhotoCount(): array
    {
        return [
            1 => ['solo'],
            2 => ['duo_vertical', 'duo_horizontal'],
            3 => ['trio_hero_left', 'trio_hero_top', 'strip_three'],
            4 => ['quad_grid', 'quad_hero', 'strip_four'],
            5 => ['quintet_mosaic'],
            6 => ['sextet_grid'],
        ];
    }

    public static function maxPhotosPerPage(): int
    {
        return 6;
    }

    public static function randomFor(int $photoCount): string
    {
        $options = self::byPhotoCount()[$photoCount] ?? ['quad_grid'];

        return $options[array_rand($options)];
    }
}

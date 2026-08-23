<?php

namespace App\Support;

/**
 * Catalogue des mises en page disponibles pour une page de livre — combien de
 * photos elle accueille, comment, et sous quel nom on la propose à la
 * famille. Utilisé pour tirer au sort une mise en page adaptée au nombre de
 * photos lors de la composition d'un livre, et pour valider/choisir
 * explicitement un gabarit page par page (App\Http\Controllers\Api\BookController).
 *
 * Le rendu concret (table HTML pour le PDF, grille CSS pour l'aperçu web) est
 * codé séparément dans resources/views/book-pdf.blade.php et
 * src/lib/bookLayouts.ts + src/components/BookPagePreview.tsx — les deux
 * DOIVENT rester visuellement cohérents avec ce catalogue.
 */
class BookLayouts
{
    public static function all(): array
    {
        return [
            'solo' => ['label' => 'Photo pleine page', 'photo_count' => 1],
            'duo_vertical' => ['label' => 'Duo côte à côte', 'photo_count' => 2],
            'duo_horizontal' => ['label' => 'Duo empilé', 'photo_count' => 2],
            'duo_stack_uneven' => ['label' => 'Duo — grande en haut, petite en bas', 'photo_count' => 2],
            'trio_hero_left' => ['label' => 'Trio — grande à gauche', 'photo_count' => 3],
            'trio_hero_top' => ['label' => 'Trio — grande en haut', 'photo_count' => 3],
            'strip_three' => ['label' => 'Trio — bandeau', 'photo_count' => 3],
            'quad_grid' => ['label' => 'Quatuor — grille 2×2', 'photo_count' => 4],
            'quad_hero' => ['label' => 'Quatuor — grande + 3', 'photo_count' => 4],
            'strip_four' => ['label' => 'Quatuor — bandeau', 'photo_count' => 4],
            'quintet_mosaic' => ['label' => 'Cinq photos — mosaïque', 'photo_count' => 5],
            'quintet_strip_top' => ['label' => 'Cinq photos — grande en haut', 'photo_count' => 5],
            'sextet_grid' => ['label' => 'Six photos — grille 3×2', 'photo_count' => 6],
            'sextet_hero_grid' => ['label' => 'Six photos — grande + 5', 'photo_count' => 6],
            'septet_mosaic' => ['label' => 'Sept photos — mosaïque dense', 'photo_count' => 7],
            'septet_hero_top' => ['label' => 'Sept photos — grande en haut', 'photo_count' => 7],
            'octet_grid' => ['label' => 'Huit photos — grille 4×2', 'photo_count' => 8],
            'octet_banner_grid' => ['label' => 'Huit photos — grande + 7', 'photo_count' => 8],
            'octet_filmstrip' => ['label' => 'Huit photos — bandeau pellicule', 'photo_count' => 8],
            'nonet_grid' => ['label' => 'Neuf photos — grille 3×3', 'photo_count' => 9],
        ];
    }

    /**
     * Identifiants de mise en page groupés par nombre de photos qu'ils accueillent.
     */
    public static function byPhotoCount(): array
    {
        $grouped = [];

        foreach (self::all() as $id => $layout) {
            $grouped[$layout['photo_count']][] = $id;
        }

        return $grouped;
    }

    public static function maxPhotosPerPage(): int
    {
        return max(array_column(self::all(), 'photo_count'));
    }

    public static function randomFor(int $photoCount): string
    {
        $options = self::byPhotoCount()[$photoCount] ?? ['quad_grid'];

        return $options[array_rand($options)];
    }

    /**
     * Un identifiant de mise en page est valide pour une page donnée s'il
     * accueille exactement le même nombre de photos qu'elle contient déjà —
     * changer de gabarit ne doit jamais changer combien de photos il faut.
     */
    public static function isValidFor(string $layoutType, int $photoCount): bool
    {
        return in_array($layoutType, self::byPhotoCount()[$photoCount] ?? [], true);
    }

    public static function ids(): array
    {
        return array_keys(self::all());
    }

    /**
     * Géométrie de chaque case photo d'une mise en page — largeur (fraction de
     * la largeur de page) et hauteur (fraction des rangées, ou fraction directe
     * pour les rangées inégales) — utilisée pour recadrer chaque photo à
     * l'avance (App\Http\Controllers\Api\BookController::cropToAspectAndEncode)
     * avant de l'intégrer au PDF, car dompdf n'applique pas object-fit/object-position
     * en CSS. Reflète exactement les largeurs/hauteurs codées en dur dans les
     * blocs @case de resources/views/book-pdf.blade.php — les deux DOIVENT
     * rester synchronisés si une mise en page y est modifiée.
     */
    public static function cellGeometry(string $layoutType): array
    {
        return match ($layoutType) {
            'solo' => [
                ['w' => 1.0, 'spanRows' => 1, 'totalRows' => 1],
            ],
            'duo_vertical' => [
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 1],
            ],
            'duo_horizontal' => [
                ['w' => 1.0, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 1.0, 'spanRows' => 1, 'totalRows' => 2],
            ],
            'duo_stack_uneven' => [
                ['w' => 1.0, 'hFrac' => 0.67],
                ['w' => 1.0, 'hFrac' => 0.33],
            ],
            'trio_hero_left' => [
                ['w' => 0.5, 'spanRows' => 2, 'totalRows' => 2],
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 2],
            ],
            'trio_hero_top' => [
                ['w' => 1.0, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 2],
            ],
            'strip_three' => [
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 1],
            ],
            'quad_grid' => [
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.5, 'spanRows' => 1, 'totalRows' => 2],
            ],
            'quad_hero' => [
                ['w' => 0.6, 'spanRows' => 3, 'totalRows' => 3],
                ['w' => 0.4, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.4, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.4, 'spanRows' => 1, 'totalRows' => 3],
            ],
            'strip_four' => [
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 1],
            ],
            'quintet_mosaic' => [
                ['w' => 0.55, 'spanRows' => 2, 'totalRows' => 2],
                ['w' => 0.225, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.225, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.225, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.225, 'spanRows' => 1, 'totalRows' => 2],
            ],
            'quintet_strip_top' => [
                ['w' => 1.0, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
            ],
            'sextet_grid' => [
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 2],
            ],
            'sextet_hero_grid' => [
                ['w' => 0.66, 'spanRows' => 2, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
            ],
            'septet_mosaic' => [
                ['w' => 0.34, 'spanRows' => 3, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
            ],
            'septet_hero_top' => [
                ['w' => 1.0, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
            ],
            'octet_grid' => [
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
                ['w' => 0.25, 'spanRows' => 1, 'totalRows' => 2],
            ],
            'octet_banner_grid' => [
                ['w' => 0.66, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
            ],
            'octet_filmstrip' => [
                ['w' => 0.125, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.125, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.125, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.125, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.125, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.125, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.125, 'spanRows' => 1, 'totalRows' => 1],
                ['w' => 0.125, 'spanRows' => 1, 'totalRows' => 1],
            ],
            'nonet_grid' => [
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.34, 'spanRows' => 1, 'totalRows' => 3],
                ['w' => 0.33, 'spanRows' => 1, 'totalRows' => 3],
            ],
            default => [],
        };
    }
}

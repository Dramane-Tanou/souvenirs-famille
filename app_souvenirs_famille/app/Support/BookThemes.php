<?php

namespace App\Support;

/**
 * Catalogue des designs de livre disponibles (page de garde, page de fin et
 * mise en page du contenu). Source unique de vérité, utilisée par l'API
 * (liste + validation) et par la vue PDF (resources/views/book-pdf.blade.php).
 * Le frontend garde un miroir de ces mêmes données dans src/lib/bookThemes.ts
 * pour l'aperçu web — les deux DOIVENT rester synchronisés.
 *
 * `ornament` est un caractère décoratif (gravure) affiché aux quatre coins de
 * la couverture et de la quatrième de couverture ; une chaîne vide désactive
 * la décoration pour les thèmes volontairement minimalistes.
 */
class BookThemes
{
    public static function all(): array
    {
        return [
            'classic_ivory' => [
                'name' => 'Classique Ivoire',
                'mood' => 'Sobre et intemporel',
                'background' => '#FDF8F3',
                'accent' => '#712B13',
                'text' => '#3A2A22',
                'font' => 'serif',
                'border' => '2px solid #712B13',
                'photo_radius' => '8px',
                'ornament' => '❦',
            ],
            'terre_afrique' => [
                'name' => "Terre d'Afrique",
                'mood' => 'Chaleureux et affirmé',
                'background' => '#B5651D',
                'accent' => '#E8B84B',
                'text' => '#2E1E10',
                'font' => 'sans-serif',
                'border' => '6px solid #4E3524',
                'photo_radius' => '4px',
                'ornament' => '✺',
            ],
            'douceur_pastel' => [
                'name' => 'Douceur Pastel',
                'mood' => 'Doux, idéal bébé/enfant',
                'background' => '#FBEFF5',
                'accent' => '#C98CA6',
                'text' => '#4A2F3B',
                'font' => 'sans-serif',
                'border' => '3px dotted #C98CA6',
                'photo_radius' => '16px',
                'ornament' => '✿',
            ],
            'noir_or' => [
                'name' => 'Noir & Or',
                'mood' => 'Premium, soirée / anniversaire',
                'background' => '#111111',
                'accent' => '#D4AF37',
                'text' => '#F3E3B3',
                'font' => 'serif',
                'border' => '2px double #D4AF37',
                'photo_radius' => '4px',
                'ornament' => '✦',
            ],
            'bleu_marine' => [
                'name' => 'Bleu Marine',
                'mood' => 'Moderne et épuré',
                'background' => '#13294B',
                'accent' => '#9FB8D9',
                'text' => '#F5F5F0',
                'font' => 'sans-serif',
                'border' => '1px solid #9FB8D9',
                'photo_radius' => '6px',
                'ornament' => '✧',
            ],
            'vert_olive' => [
                'name' => 'Vert Olive Nature',
                'mood' => 'Naturel et apaisant',
                'background' => '#EFEFE0',
                'accent' => '#5B6B3E',
                'text' => '#33361F',
                'font' => 'serif',
                'border' => '3px double #5B6B3E',
                'photo_radius' => '6px',
                'ornament' => '❧',
            ],
            'blanc_minimal' => [
                'name' => 'Blanc Minimal',
                'mood' => 'Minimaliste, scandinave',
                'background' => '#FFFFFF',
                'accent' => '#111111',
                'text' => '#111111',
                'font' => 'sans-serif',
                'border' => '1px solid #111111',
                'photo_radius' => '0px',
                'ornament' => '',
            ],
            'kraft_scrapbook' => [
                'name' => 'Kraft Scrapbook',
                'mood' => 'Album souvenir, décontracté',
                'background' => '#C8A165',
                'accent' => '#5A3E20',
                'text' => '#3A2A14',
                'font' => 'serif',
                'border' => '10px solid #FFFFFF',
                'photo_radius' => '2px',
                'ornament' => '❉',
            ],
            'corail_vif' => [
                'name' => 'Corail Vif',
                'mood' => 'Énergique, famille nombreuse',
                'background' => '#FF6B4A',
                'accent' => '#FFD166',
                'text' => '#FFFFFF',
                'font' => 'sans-serif',
                'border' => '6px solid #FFD166',
                'photo_radius' => '12px',
                'ornament' => '❊',
            ],
            'bordeaux_elegant' => [
                'name' => 'Bordeaux Élégant',
                'mood' => 'Formel et élégant',
                'background' => '#F7F0EC',
                'accent' => '#6E1423',
                'text' => '#2B1210',
                'font' => 'serif',
                'border' => '2px double #6E1423',
                'photo_radius' => '4px',
                'ornament' => '❖',
            ],
            'emeraude_royal' => [
                'name' => 'Émeraude Royal',
                'mood' => 'Prestige, réception',
                'background' => '#0B3D2E',
                'accent' => '#C9A227',
                'text' => '#F1E9C9',
                'font' => 'serif',
                'border' => '3px double #C9A227',
                'photo_radius' => '6px',
                'ornament' => '⚜',
            ],
            'rose_vintage' => [
                'name' => 'Rose Vintage',
                'mood' => 'Romantique, mariage / couple',
                'background' => '#F3E1E4',
                'accent' => '#8C4B5B',
                'text' => '#3B2226',
                'font' => 'serif',
                'border' => '2px solid #8C4B5B',
                'photo_radius' => '10px',
                'ornament' => '❁',
            ],
            'graphite_argent' => [
                'name' => 'Graphite Argent',
                'mood' => 'Contemporain, professionnel',
                'background' => '#2B2E33',
                'accent' => '#C7CDD3',
                'text' => '#ECEFF2',
                'font' => 'sans-serif',
                'border' => '1px solid #C7CDD3',
                'photo_radius' => '4px',
                'ornament' => '✵',
            ],
            'sepia_ancien' => [
                'name' => 'Sépia Ancien',
                'mood' => 'Album de famille rétro',
                'background' => '#E4D2B0',
                'accent' => '#6B4226',
                'text' => '#402A18',
                'font' => 'serif',
                'border' => '8px ridge #6B4226',
                'photo_radius' => '2px',
                'ornament' => '☙',
            ],
            'lavande_douce' => [
                'name' => 'Lavande Douce',
                'mood' => 'Élégant et apaisant',
                'background' => '#EDE7F6',
                'accent' => '#6A4C93',
                'text' => '#2E1F45',
                'font' => 'serif',
                'border' => '2px double #6A4C93',
                'photo_radius' => '8px',
                'ornament' => '✤',
            ],
        ];
    }

    public static function get(string $id): ?array
    {
        $theme = self::all()[$id] ?? null;

        return $theme ? [...$theme, 'id' => $id] : null;
    }

    public static function ids(): array
    {
        return array_keys(self::all());
    }

    /**
     * Styles d'écriture proposés pour la dédicace (couverture / quatrième de
     * couverture) — restreints aux familles de polices que dompdf sait
     * rendre nativement, pour un rendu PDF fidèle à l'aperçu web.
     */
    public static function dedicationFonts(): array
    {
        return [
            'classic' => ['label' => 'Classique', 'font_family' => 'serif', 'font_style' => 'normal'],
            'elegant_italic' => ['label' => 'Élégant (italique)', 'font_family' => 'serif', 'font_style' => 'italic'],
            'modern' => ['label' => 'Moderne', 'font_family' => 'sans-serif', 'font_style' => 'normal'],
            'modern_italic' => ['label' => 'Moderne (italique)', 'font_family' => 'sans-serif', 'font_style' => 'italic'],
        ];
    }

    public static function dedicationFontIds(): array
    {
        return array_keys(self::dedicationFonts());
    }
}

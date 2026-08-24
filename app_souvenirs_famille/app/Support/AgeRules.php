<?php

namespace App\Support;

class AgeRules
{
    /**
     * Âge minimum pour créer ou détenir un compte — 13 ans est le plancher
     * absolu autorisé par le RGPD pour le consentement numérique (aucun pays
     * de l'UE ne peut le fixer plus bas) et reste hors du champ de la COPPA
     * américaine (qui vise spécifiquement les moins de 13 ans), sans
     * nécessiter de système de vérification du consentement parental.
     */
    private const MIN_AGE_YEARS = 13;

    /**
     * Règle de validation Laravel pour birth_date : la date doit être
     * antérieure ou égale à "aujourd'hui moins MIN_AGE_YEARS ans", donc la
     * personne a bien au moins cet âge aujourd'hui.
     */
    public static function minBirthDateRule(): string
    {
        return 'before_or_equal:' . now()->subYears(self::MIN_AGE_YEARS)->toDateString();
    }

    public static function minAgeYears(): int
    {
        return self::MIN_AGE_YEARS;
    }
}

<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Résout l'adresse IP d'un visiteur vers un pays et une devise suggérée,
 * pour proposer/convertir le prix du livre dans la devise locale.
 *
 * Ne bloque jamais l'utilisateur : toute erreur ou IP locale retombe
 * silencieusement sur la Suisse (CHF), l'utilisateur pouvant de toute
 * façon corriger manuellement la devise dans l'interface.
 */
class GeoCurrency
{
    // Zone UEMOA (Afrique de l'Ouest, franc CFA).
    private const UEMOA_COUNTRIES = ['BF', 'CI', 'SN', 'ML', 'BJ', 'TG', 'NE', 'GW'];

    // Zone CEMAC (Afrique centrale, franc CFA — peg identique à l'UEMOA mais devise distincte).
    private const CEMAC_COUNTRIES = ['CM', 'GA', 'TD', 'CG', 'CF', 'GQ'];

    // Principaux pays de la zone euro.
    private const EURO_COUNTRIES = [
        'FR', 'DE', 'IT', 'ES', 'PT', 'BE', 'NL', 'LU', 'AT', 'IE', 'FI', 'GR', 'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'HR',
    ];

    public static function resolve(string $ip): array
    {
        if (self::isLocal($ip)) {
            return ['country' => 'CH', 'currency' => 'CHF'];
        }

        $country = Cache::remember("geo_ip:{$ip}", now()->addHour(), function () use ($ip) {
            try {
                $response = Http::timeout(2)->get("http://ip-api.com/json/{$ip}", [
                    'fields' => 'status,countryCode',
                ]);

                if ($response->ok() && $response->json('status') === 'success') {
                    return $response->json('countryCode');
                }
            } catch (\Throwable $e) {
                Log::warning("Géolocalisation IP échouée pour {$ip} : {$e->getMessage()}");
            }

            return null;
        });

        return ['country' => $country ?? 'CH', 'currency' => self::currencyForCountry($country ?? 'CH')];
    }

    public static function currencyForCountry(string $countryCode): string
    {
        if ($countryCode === 'CH' || $countryCode === 'LI') {
            return 'CHF';
        }

        if (in_array($countryCode, self::UEMOA_COUNTRIES, true)) {
            return 'XOF';
        }

        if (in_array($countryCode, self::CEMAC_COUNTRIES, true)) {
            return 'XAF';
        }

        if (in_array($countryCode, self::EURO_COUNTRIES, true)) {
            return 'EUR';
        }

        if ($countryCode === 'GB') {
            return 'GBP';
        }

        if ($countryCode === 'CA') {
            return 'CAD';
        }

        if (in_array($countryCode, ['AU', 'NZ'], true)) {
            return 'AUD';
        }

        // Reste du monde (Amériques, Asie, autre Afrique, Océanie...) : USD,
        // universellement accepté par Stripe/PayPal — jamais un blocage.
        return 'USD';
    }

    private static function isLocal(string $ip): bool
    {
        return in_array($ip, ['127.0.0.1', '::1'], true)
            || str_starts_with($ip, '192.168.')
            || str_starts_with($ip, '10.')
            || str_starts_with($ip, '172.');
    }
}

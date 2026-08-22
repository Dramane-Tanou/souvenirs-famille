<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Taux de change CHF → devise, rafraîchis automatiquement une fois par jour
 * (API gratuite, sans clé) plutôt qu'à chaque requête : évite d'ajouter de la
 * latence/fragilité au paiement, et retombe sur les taux fixes de
 * config/currencies.php si l'API est indisponible.
 */
class CurrencyRates
{
    private const CACHE_KEY = 'currency_rates_live';

    public static function get(string $currency): float
    {
        return self::all()[$currency] ?? (float) config("currencies.rates.{$currency}", 1);
    }

    public static function all(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addHours(24), function () {
            try {
                $response = Http::timeout(3)->get('https://open.er-api.com/v6/latest/CHF');

                if ($response->ok() && $response->json('result') === 'success') {
                    return $response->json('rates');
                }
            } catch (\Throwable $e) {
                Log::warning("Taux de change live indisponibles, repli sur les taux fixes : {$e->getMessage()}");
            }

            return config('currencies.rates');
        });
    }
}

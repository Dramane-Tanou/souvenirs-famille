<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\CurrencyRates;
use App\Support\GeoCurrency;
use Illuminate\Http\Request;

class GeoController extends Controller
{
    /**
     * Devise suggérée pour le visiteur, déduite de son adresse IP.
     * L'utilisateur peut toujours corriger manuellement côté frontend.
     */
    public function currency(Request $request)
    {
        $geo = GeoCurrency::resolve($request->ip());
        $currency = $geo['currency'];

        return response()->json([
            'country' => $geo['country'],
            'currency' => $currency,
            'symbol' => config("currencies.symbols.{$currency}"),
            'rate' => CurrencyRates::get($currency),
        ]);
    }

    /**
     * Taux de change CHF → devise pour toutes les devises supportées
     * (rafraîchis automatiquement toutes les 24h, voir CurrencyRates).
     */
    public function rates()
    {
        $supported = array_keys(config('currencies.rates'));
        $live = CurrencyRates::all();

        return response()->json(
            collect($supported)->mapWithKeys(fn ($currency) => [
                $currency => $live[$currency] ?? config("currencies.rates.{$currency}"),
            ])
        );
    }
}

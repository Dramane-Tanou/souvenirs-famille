<?php

return [

    'base' => 'CHF',

    /*
    |--------------------------------------------------------------------------
    | Taux de change (repli)
    |--------------------------------------------------------------------------
    |
    | Unités de devise pour 1 CHF. Ces valeurs ne sont utilisées QUE si l'API
    | de taux live (voir App\Support\CurrencyRates, rafraîchie toutes les 24h)
    | est indisponible — sinon les vrais taux du jour sont utilisés partout.
    | Le XOF n'a pas de décimales (arrondi à l'unité).
    |
    */
    'rates' => [
        'CHF' => 1,
        'EUR' => 1.05,
        'USD' => 1.15,
        'GBP' => 0.88,
        'CAD' => 1.58,
        'AUD' => 1.75,
        'XOF' => 690,
        'XAF' => 690,
    ],

    'symbols' => [
        'CHF' => 'CHF',
        'EUR' => '€',
        'USD' => '$',
        'GBP' => '£',
        'CAD' => 'CA$',
        'AUD' => 'AU$',
        'XOF' => 'FCFA',
        'XAF' => 'FCFA',
    ],

    // Devises n'ayant pas de sous-unité (pas de centimes à afficher).
    'zero_decimal' => ['XOF', 'XAF'],

    /*
    |--------------------------------------------------------------------------
    | Moyens de paiement autorisés par devise
    |--------------------------------------------------------------------------
    | Stripe et PayPal couvrent les devises classiques (Europe, Amérique du
    | Nord, Océanie...) ; CinetPay couvre le Mobile Money d'Afrique de l'Ouest
    | (XOF) et d'Afrique centrale (XAF). Toute devise non listée ici retombe
    | sur USD via GeoCurrency, donc reste toujours utilisable.
    */
    'payment_methods' => [
        'CHF' => ['stripe', 'paypal'],
        'EUR' => ['stripe', 'paypal'],
        'USD' => ['stripe', 'paypal'],
        'GBP' => ['stripe', 'paypal'],
        'CAD' => ['stripe', 'paypal'],
        'AUD' => ['stripe', 'paypal'],
        'XOF' => ['cinetpay'],
        'XAF' => ['cinetpay'],
    ],

];

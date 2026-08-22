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
        'XOF' => 690,
    ],

    'symbols' => [
        'CHF' => 'CHF',
        'EUR' => '€',
        'USD' => '$',
        'XOF' => 'FCFA',
    ],

    // Devises n'ayant pas de sous-unité (pas de centimes à afficher).
    'zero_decimal' => ['XOF'],

    /*
    |--------------------------------------------------------------------------
    | Moyens de paiement autorisés par devise
    |--------------------------------------------------------------------------
    */
    'payment_methods' => [
        'CHF' => ['stripe', 'paypal'],
        'EUR' => ['stripe', 'paypal'],
        'USD' => ['stripe', 'paypal'],
        'XOF' => ['cinetpay'],
    ],

];

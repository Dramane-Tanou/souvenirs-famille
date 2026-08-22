<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Mode test
    |--------------------------------------------------------------------------
    |
    | Tant qu'aucun compte marchand réel (Stripe/PayPal/CinetPay) n'est
    | configuré, ce mode permet de valider les commandes et abonnements
    | immédiatement, sans passer par un vrai prestataire de paiement — utile
    | pour tester le reste du parcours (livre PDF, abonnement) en attendant
    | les identifiants réels. À désactiver dès que les vrais moyens de
    | paiement sont configurés.
    |
    */
    'test_mode' => env('PAYMENTS_TEST_MODE', false),

];

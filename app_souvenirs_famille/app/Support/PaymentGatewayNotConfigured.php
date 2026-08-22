<?php

namespace App\Support;

/**
 * Levée quand un prestataire de paiement est appelé sans que ses clés API
 * n'aient été renseignées dans .env — permet de renvoyer un message clair
 * au frontend plutôt qu'un crash générique.
 */
class PaymentGatewayNotConfigured extends \RuntimeException
{
    public function __construct(string $gateway)
    {
        parent::__construct("Le moyen de paiement « {$gateway} » n'est pas encore configuré.");
    }
}

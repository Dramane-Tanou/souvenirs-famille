<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use InvalidArgumentException;

class PaymentGatewayFactory
{
    public static function make(string $method): PaymentGateway
    {
        return match ($method) {
            'stripe' => new StripeGateway(),
            'paypal' => new PaypalGateway(),
            'cinetpay' => new CinetPayGateway(),
            default => throw new InvalidArgumentException("Moyen de paiement inconnu : {$method}"),
        };
    }
}

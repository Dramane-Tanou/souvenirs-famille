<?php

namespace App\Contracts;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

interface PaymentGateway
{
    /**
     * Démarre le paiement d'une ressource payable (commande de livre ou
     * abonnement famille — toute ressource avec id/price_cents/currency et
     * une colonne payment_reference) et retourne l'URL de paiement.
     *
     * @throws \App\Support\PaymentGatewayNotConfigured
     */
    public function initiate(Model $payable, string $description, string $returnUrl, string $cancelUrl): string;

    /**
     * Traite une notification (webhook) du prestataire et met à jour la
     * ressource correspondante via PaymentReconciler. Doit vérifier
     * l'authenticité de la notification avant toute mise à jour.
     */
    public function handleWebhook(Request $request): Response;
}

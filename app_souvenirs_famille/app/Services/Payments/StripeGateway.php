<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Support\PaymentGatewayNotConfigured;
use App\Support\PaymentReconciler;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripeGateway implements PaymentGateway
{
    private function client(): StripeClient
    {
        $secret = config('services.stripe.secret');

        if (! $secret) {
            throw new PaymentGatewayNotConfigured('Stripe');
        }

        return new StripeClient($secret);
    }

    public function initiate(Model $payable, string $description, string $returnUrl, string $cancelUrl): string
    {
        $session = $this->client()->checkout->sessions->create([
            'mode' => 'payment',
            'success_url' => $returnUrl . '?payment=success',
            'cancel_url' => $cancelUrl . '?payment=cancelled',
            'line_items' => [[
                'price_data' => [
                    'currency' => strtolower($payable->currency),
                    'unit_amount' => $payable->price_cents,
                    'product_data' => ['name' => $description],
                ],
                'quantity' => 1,
            ]],
            'metadata' => ['payable_id' => $payable->id],
        ]);

        $payable->update(['payment_reference' => $session->id]);

        return $session->url;
    }

    public function handleWebhook(Request $request): Response
    {
        $secret = config('services.stripe.webhook_secret');

        try {
            if ($secret) {
                $event = Webhook::constructEvent(
                    $request->getContent(),
                    $request->header('Stripe-Signature', ''),
                    $secret
                );
            } else {
                // Pas de secret configuré (dev sans clés) : on lit le payload tel quel,
                // sans garantie d'authenticité — jamais utilisé en production.
                $event = json_decode($request->getContent());
            }
        } catch (\Throwable $e) {
            Log::warning("Webhook Stripe invalide : {$e->getMessage()}");

            return response('invalid signature', 400);
        }

        if (($event->type ?? null) === 'checkout.session.completed') {
            PaymentReconciler::markPaid($event->data->object->id);
        }

        return response('ok');
    }
}

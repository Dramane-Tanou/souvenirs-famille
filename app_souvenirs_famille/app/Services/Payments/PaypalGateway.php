<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Models\Order;
use App\Support\PaymentGatewayNotConfigured;
use App\Support\PaymentReconciler;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaypalGateway implements PaymentGateway
{
    private function baseUrl(): string
    {
        return config('services.paypal.mode') === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    private function accessToken(): string
    {
        $clientId = config('services.paypal.client_id');
        $secret = config('services.paypal.client_secret');

        if (! $clientId || ! $secret) {
            throw new PaymentGatewayNotConfigured('PayPal');
        }

        return Cache::remember('paypal_access_token', now()->addHours(7), function () use ($clientId, $secret) {
            $response = Http::asForm()
                ->withBasicAuth($clientId, $secret)
                ->post($this->baseUrl() . '/v1/oauth2/token', ['grant_type' => 'client_credentials']);

            return $response->json('access_token');
        });
    }

    /**
     * PayPal doit rediriger l'utilisateur vers NOTRE backend (pas directement
     * vers le frontend) pour qu'on puisse capturer le paiement au retour —
     * $returnUrl/$cancelUrl du contrat sont donc ignorés ici volontairement.
     */
    public function initiate(Model $payable, string $description, string $returnUrl, string $cancelUrl): string
    {
        $type = $payable instanceof Order ? 'order' : 'subscription';

        $response = Http::withToken($this->accessToken())
            ->post($this->baseUrl() . '/v2/checkout/orders', [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => "{$type}-{$payable->id}",
                    'description' => $description,
                    'amount' => [
                        'currency_code' => $payable->currency,
                        'value' => number_format($payable->price_cents / 100, 2, '.', ''),
                    ],
                ]],
                'application_context' => [
                    'return_url' => route('payments.paypal.return', ['type' => $type, 'id' => $payable->id]),
                    'cancel_url' => route('payments.paypal.cancel', ['type' => $type, 'id' => $payable->id]),
                ],
            ]);

        $data = $response->json();
        $payable->update(['payment_reference' => $data['id'] ?? null]);

        $approveLink = collect($data['links'] ?? [])->firstWhere('rel', 'approve');

        if (! $approveLink) {
            Log::error('Réponse PayPal inattendue : ' . $response->body());

            throw new \RuntimeException('Impossible de démarrer le paiement PayPal.');
        }

        return $approveLink['href'];
    }

    /**
     * Capture le paiement une fois l'utilisateur revenu d'approbation PayPal.
     * C'est la confirmation principale (le webhook n'est qu'un filet de sécurité).
     */
    public function capture(string $paypalOrderId): bool
    {
        $response = Http::withToken($this->accessToken())
            ->post($this->baseUrl() . "/v2/checkout/orders/{$paypalOrderId}/capture");

        if ($response->successful() && $response->json('status') === 'COMPLETED') {
            PaymentReconciler::markPaid($paypalOrderId);

            return true;
        }

        Log::warning('Capture PayPal échouée : ' . $response->body());

        return false;
    }

    public function handleWebhook(Request $request): Response
    {
        $resource = $request->input('resource', []);

        if ($request->input('event_type') === 'PAYMENT.CAPTURE.COMPLETED') {
            $paypalOrderId = $resource['supplementary_data']['related_ids']['order_id'] ?? null;

            if ($paypalOrderId) {
                PaymentReconciler::markPaid($paypalOrderId);
            }
        }

        return response('ok');
    }
}

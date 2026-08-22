<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Support\PaymentGatewayNotConfigured;
use App\Support\PaymentReconciler;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CinetPayGateway implements PaymentGateway
{
    public function initiate(Model $payable, string $description, string $returnUrl, string $cancelUrl): string
    {
        $apiKey = config('services.cinetpay.api_key');
        $siteId = config('services.cinetpay.site_id');

        if (! $apiKey || ! $siteId) {
            throw new PaymentGatewayNotConfigured('CinetPay');
        }

        // transaction_id doit être unique côté CinetPay : on préfixe par le type
        // et l'id de la ressource pour rester lisible en cas de débogage.
        $type = class_basename($payable);
        $transactionId = strtolower($type) . '-' . $payable->id . '-' . uniqid();

        $response = Http::asForm()->post('https://api-checkout.cinetpay.com/v2/payment', [
            'apikey' => $apiKey,
            'site_id' => $siteId,
            'transaction_id' => $transactionId,
            'amount' => $payable->price_cents, // XOF est une devise sans décimales
            'currency' => $payable->currency,
            'description' => $description,
            'notify_url' => route('payments.webhook', 'cinetpay'),
            'return_url' => $returnUrl . '?payment=success',
            'channels' => 'ALL',
        ]);

        $data = $response->json();

        if (($data['code'] ?? null) !== '201') {
            Log::error('Réponse CinetPay inattendue : ' . $response->body());

            throw new \RuntimeException('Impossible de démarrer le paiement Mobile Money.');
        }

        $payable->update(['payment_reference' => $transactionId]);

        return $data['data']['payment_url'];
    }

    public function handleWebhook(Request $request): Response
    {
        $transactionId = $request->input('cpm_trans_id') ?? $request->input('transaction_id');

        if (! $transactionId) {
            return response('missing transaction id', 400);
        }

        // CinetPay documente explicitement de ne jamais faire confiance au
        // webhook seul : on revérifie le statut réel côté serveur avant de valider.
        $check = Http::asForm()->post('https://api-checkout.cinetpay.com/v2/payment/check', [
            'apikey' => config('services.cinetpay.api_key'),
            'site_id' => config('services.cinetpay.site_id'),
            'transaction_id' => $transactionId,
        ]);

        if ($check->json('data.status') === 'ACCEPTED') {
            PaymentReconciler::markPaid($transactionId);
        }

        return response('ok');
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Subscription;
use App\Services\Payments\PaymentGatewayFactory;
use App\Services\Payments\PaypalGateway;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * Point d'entrée commun aux webhooks des trois prestataires.
     */
    public function webhook(Request $request, string $provider)
    {
        return PaymentGatewayFactory::make($provider)->handleWebhook($request);
    }

    /**
     * Retour de l'utilisateur après approbation PayPal : capture le paiement
     * puis redirige vers la page concernée (commande de livre ou abonnement).
     */
    public function paypalReturn(Request $request, string $type, int $id)
    {
        $paypalOrderId = $request->query('token');

        if ($paypalOrderId) {
            /** @var PaypalGateway $gateway */
            $gateway = PaymentGatewayFactory::make('paypal');
            $gateway->capture($paypalOrderId);
        }

        return $this->redirectAfterPayment($type, $id, 'success');
    }

    public function paypalCancel(Request $request, string $type, int $id)
    {
        return $this->redirectAfterPayment($type, $id, 'cancelled');
    }

    private function redirectAfterPayment(string $type, int $id, string $status)
    {
        $frontendUrl = rtrim(config('app.frontend_url'), '/');

        if ($type === 'subscription') {
            $subscription = Subscription::find($id);

            if ($subscription) {
                return redirect("{$frontendUrl}/families/{$subscription->family_id}/subscription?payment={$status}");
            }
        } else {
            $order = Order::with('book')->find($id);

            if ($order) {
                return redirect(
                    "{$frontendUrl}/families/{$order->book->family_id}/books/{$order->book_id}/order?payment={$status}"
                );
            }
        }

        return redirect("{$frontendUrl}/dashboard?payment={$status}");
    }
}

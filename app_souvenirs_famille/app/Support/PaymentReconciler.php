<?php

namespace App\Support;

use App\Models\Order;
use App\Models\Subscription;

/**
 * Point unique où un webhook de paiement confirmé fait passer la bonne
 * ressource (commande de livre OU abonnement famille) à l'état payé —
 * les deux partagent le même espace de `payment_reference`, généré par
 * le prestataire, donc une seule des deux requêtes trouvera une ligne.
 */
class PaymentReconciler
{
    public static function markPaid(string $reference): void
    {
        $order = Order::where('payment_reference', $reference)->first();

        if ($order) {
            $order->update(['payment_status' => 'paid']);

            return;
        }

        Subscription::where('payment_reference', $reference)->update(['status' => 'active']);
    }
}

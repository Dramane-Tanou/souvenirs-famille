<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\Subscription;
use App\Services\Payments\PaymentGatewayFactory;
use App\Support\CurrencyRates;
use App\Support\PaymentGatewayNotConfigured;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SubscriptionController extends Controller
{
    /**
     * Voir le plan actuel de la famille + usage du stockage.
     */
    public function show(Family $family)
    {
        $this->authorizeFamilyMember($family);
        $family->load('subscription'); // force un rechargement frais de la relation

        $plan = $family->currentPlan();
        $photoCount = $family->memories()->count();
        $maxPhotos = config('plans.free.max_photos');

        return response()->json([
            'plan' => $plan,
            'status' => $family->subscription?->status ?? 'active',
            'photo_count' => $photoCount,
            'max_photos' => $plan === 'free' ? $maxPhotos : null,
            'is_limit_reached' => $plan === 'free' && $photoCount >= $maxPhotos,
            'pending_subscription' => $family->subscription?->status === 'pending' ? [
                'price_cents' => $family->subscription->price_cents,
                'currency' => $family->subscription->currency,
            ] : null,
        ]);
    }

    /**
     * Démarre le paiement du plan payant "Famille" auprès du moyen de
     * paiement choisi. L'abonnement ne devient actif qu'une fois le
     * paiement confirmé (webhook / retour du prestataire).
     */
    public function upgrade(Request $request, Family $family)
    {
        $this->authorizeFamilyMember($family, requireAdmin: true);

        if ($family->currentPlan() === 'family') {
            return response()->json(['message' => 'Cette famille est déjà abonnée au plan Famille.'], 422);
        }

        $validCurrencies = array_keys(config('currencies.rates'));

        $validated = $request->validate([
            'currency' => ['required', 'in:' . implode(',', $validCurrencies)],
            'payment_method' => ['required', 'in:stripe,paypal,cinetpay'],
        ]);

        $allowedMethods = config("currencies.payment_methods.{$validated['currency']}", []);
        if (! in_array($validated['payment_method'], $allowedMethods, true)) {
            return response()->json([
                'message' => "Ce moyen de paiement n'est pas disponible pour la devise {$validated['currency']}.",
            ], 422);
        }

        $priceChfCents = config('plans.family.price_cents');
        $rate = CurrencyRates::get($validated['currency']);
        $isZeroDecimal = in_array($validated['currency'], config('currencies.zero_decimal', []), true);
        $convertedAmount = ($priceChfCents / 100) * $rate;
        $price = $isZeroDecimal ? (int) round($convertedAmount) : (int) round($convertedAmount * 100);

        $wasNew = ! $family->subscription()->exists();

        $subscription = Subscription::updateOrCreate(
            ['family_id' => $family->id],
            [
                'plan' => 'family',
                'status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'price_cents' => $price,
                'currency' => $validated['currency'],
                'starts_at' => now(),
                'ends_at' => null,
            ]
        );

        $frontendUrl = rtrim(config('app.frontend_url'), '/');
        $subscriptionPageUrl = "{$frontendUrl}/families/{$family->id}/subscription";

        try {
            $checkoutUrl = PaymentGatewayFactory::make($validated['payment_method'])->initiate(
                $subscription,
                'Abonnement Famille — Souvenirs Famille',
                $subscriptionPageUrl,
                $subscriptionPageUrl
            );
        } catch (PaymentGatewayNotConfigured $e) {
            $wasNew ? $subscription->delete() : $subscription->update(['status' => 'canceled']);

            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            $wasNew ? $subscription->delete() : $subscription->update(['status' => 'canceled']);

            return response()->json(['message' => 'Impossible de démarrer le paiement pour le moment.'], 502);
        }

        return response()->json(['subscription' => $subscription, 'checkout_url' => $checkoutUrl], 201);
    }

    /**
     * Revenir au plan gratuit (annulation).
     */
    public function downgrade(Family $family)
    {
        $this->authorizeFamilyMember($family, requireAdmin: true);
        $family->load('subscription');

        $subscription = $family->subscription;

        if ($subscription) {
            $subscription->update(['status' => 'canceled', 'ends_at' => now()]);
        }

        return response()->json(['message' => 'Retour au plan gratuit effectué.']);
    }

    private function authorizeFamilyMember(Family $family, bool $requireAdmin = false): void
    {
        $membership = $family->members()->where('user_id', Auth::id())->first();

        if (! $membership) {
            abort(403, "Tu ne fais pas partie de cette famille.");
        }

        if ($requireAdmin && $membership->pivot->role !== 'admin') {
            abort(403, "Seul un administrateur peut gérer l'abonnement.");
        }
    }
}

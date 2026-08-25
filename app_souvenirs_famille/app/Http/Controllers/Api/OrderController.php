<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Family;
use App\Models\Order;
use App\Services\Payments\PaymentGatewayFactory;
use App\Support\CurrencyRates;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Grille tarifaire simplifiée (en centimes), indexée par format.
     * Le prix varie légèrement selon le nombre de pages du livre.
     */
    private const BASE_PRICE_CENTS = [
        'softcover' => 2900, // 29.00 CHF
        'hardcover' => 4900, // 49.00 CHF
        'pdf' => 990, // 9.90 CHF, prix fixe (pas d'incrément par page)
    ];
    private const PRICE_PER_PAGE_CENTS = 50; // 0.50 CHF par page au-delà de 10, formats physiques uniquement
    private const PHYSICAL_FORMATS = ['softcover', 'hardcover'];

    /**
     * Passer commande sur un livre validé — livre physique ou PDF numérique,
     * indépendamment l'un de l'autre (un seul achat par produit).
     */
    public function store(Request $request, Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        if ($book->status === 'draft') {
            return response()->json(['message' => "Valide d'abord l'album avant de passer commande."], 422);
        }

        abort_if(! $book->theme, 422, "Choisis d'abord un design pour ton album.");

        $validCurrencies = array_keys(config('currencies.rates'));

        $validated = $request->validate([
            'format' => ['required', 'in:softcover,hardcover,pdf'],
            'currency' => ['required', 'in:' . implode(',', $validCurrencies)],
            'payment_method' => ['required', 'in:stripe,paypal,cinetpay'],
            'delivery_address' => ['required_unless:format,pdf', 'nullable', 'string', 'max:1000'],
        ]);

        $allowedMethods = config("currencies.payment_methods.{$validated['currency']}", []);
        if (! in_array($validated['payment_method'], $allowedMethods, true)) {
            return response()->json([
                'message' => "Ce moyen de paiement n'est pas disponible pour la devise {$validated['currency']}.",
            ], 422);
        }

        $isPhysical = in_array($validated['format'], self::PHYSICAL_FORMATS, true);

        // Seule une commande déjà payée bloque un nouvel achat : un paiement
        // abandonné ou échoué (statut 'pending'/'failed') ne doit pas empêcher
        // de réessayer indéfiniment.
        $duplicateQuery = ($isPhysical
            ? $book->orders()->whereIn('format', self::PHYSICAL_FORMATS)
            : $book->orders()->where('format', 'pdf')
        )->where('payment_status', 'paid');

        if ($duplicateQuery->exists()) {
            return response()->json(['message' => 'Ce format a déjà été commandé pour cet album.'], 409);
        }

        $pageCount = $book->pages()->count();
        $priceChfCents = self::BASE_PRICE_CENTS[$validated['format']]
            + ($isPhysical ? max(0, $pageCount - 10) * self::PRICE_PER_PAGE_CENTS : 0);

        $rate = CurrencyRates::get($validated['currency']);
        $isZeroDecimal = in_array($validated['currency'], config('currencies.zero_decimal', []), true);
        $convertedAmount = ($priceChfCents / 100) * $rate;
        $price = $isZeroDecimal ? (int) round($convertedAmount) : (int) round($convertedAmount * 100);

        $order = DB::transaction(function () use ($book, $validated, $price, $isPhysical) {
            return Order::create([
                'book_id' => $book->id,
                'user_id' => Auth::id(),
                'format' => $validated['format'],
                'payment_method' => $validated['payment_method'],
                'price_cents' => $price,
                'currency' => $validated['currency'],
                'payment_status' => 'pending',
                'delivery_address' => $validated['delivery_address'] ?? null,
            ]);
        });

        $family = $book->family;
        $frontendUrl = rtrim(config('app.frontend_url'), '/');
        $orderPageUrl = "{$frontendUrl}/families/{$family->id}/books/{$book->id}/order";

        if (config('payments.test_mode')) {
            // Mode test : aucun prestataire réel n'est appelé, la commande est
            // validée immédiatement pour permettre de tester la suite du parcours.
            $order->update(['payment_status' => 'paid']);
            $checkoutUrl = "{$orderPageUrl}?payment=success";
        } else {
            try {
                $checkoutUrl = PaymentGatewayFactory::make($validated['payment_method'])
                    ->initiate($order, "Album photo Souvenirs Famille — commande #{$order->id}", $orderPageUrl, $orderPageUrl);
            } catch (\App\Support\PaymentGatewayNotConfigured $e) {
                $order->delete();

                return response()->json(['message' => $e->getMessage()], 422);
            } catch (\Throwable $e) {
                $order->delete();

                return response()->json(['message' => 'Impossible de démarrer le paiement pour le moment.'], 502);
            }
        }

        // Le format physique passe le livre en "commandé" dès la création de la
        // commande (le paiement peut encore échouer, mais le livre est réservé) ;
        // le PDF, lui, ne débloque le téléchargement qu'une fois réellement payé.
        if ($isPhysical) {
            $book->update(['status' => 'ordered']);
        }

        return response()->json(['order' => $order, 'checkout_url' => $checkoutUrl], 201);
    }

    /**
     * Voir le statut d'une commande.
     */
    public function show(Family $family, Book $book, Order $order)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id || $order->book_id !== $book->id, 404);

        return response()->json($order);
    }

    /**
     * Valider le livre (passage de 'draft' à 'validated'), avant de pouvoir commander.
     */
    public function validateBook(Family $family, Book $book)
    {
        $this->authorizeFamilyMember($family);
        abort_if($book->family_id !== $family->id, 404);

        if ($book->status !== 'draft') {
            return response()->json(['message' => 'Cet album a déjà été validé ou commandé.'], 422);
        }

        $book->update(['status' => 'validated']);

        return response()->json($book);
    }

    private function authorizeFamilyMember(Family $family): void
    {
        $isMember = $family->members()->where('user_id', Auth::id())->exists();

        if (! $isMember) {
            abort(403, "Tu ne fais pas partie de cette famille.");
        }
    }
}
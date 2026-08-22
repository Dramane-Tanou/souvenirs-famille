<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\Memory;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CurrencyRates;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Convertit un montant stocké (price_cents + currency) en CHF, en tenant
     * compte des devises sans sous-unité (XOF) — même logique que
     * OrderController/SubscriptionController au moment du paiement.
     */
    private function toChf(int $priceCents, string $currency): float
    {
        $isZeroDecimal = in_array($currency, config('currencies.zero_decimal', []), true);
        $amount = $isZeroDecimal ? $priceCents : $priceCents / 100;
        $rate = CurrencyRates::get($currency);

        return $rate > 0 ? $amount / $rate : 0;
    }

    /**
     * Statistiques globales : familles, abonnements, ventes de livres, revenus estimés.
     */
    public function overview()
    {
        $totalFamilies = Family::count();
        $activeSubscriptions = Subscription::where('status', 'active')->count();

        $paidOrders = Order::where('payment_status', 'paid')->get(['format', 'price_cents', 'currency']);
        $bookRevenueChf = $paidOrders->sum(fn ($order) => $this->toChf($order->price_cents, $order->currency));

        $mrrChf = Subscription::where('status', 'active')
            ->get(['price_cents', 'currency'])
            ->sum(fn ($sub) => $this->toChf($sub->price_cents, $sub->currency));

        return response()->json([
            'total_users' => User::count(),
            'total_families' => $totalFamilies,
            'active_subscriptions' => $activeSubscriptions,
            'free_families' => $totalFamilies - $activeSubscriptions,
            'total_memories' => Memory::count(),
            'orders' => [
                'paid_pdf' => $paidOrders->where('format', 'pdf')->count(),
                'paid_physical' => $paidOrders->whereIn('format', ['softcover', 'hardcover'])->count(),
                'pending' => Order::where('payment_status', 'pending')->count(),
                'failed' => Order::where('payment_status', 'failed')->count(),
            ],
            'book_revenue_chf' => round($bookRevenueChf, 2),
            'mrr_chf' => round($mrrChf, 2),
        ]);
    }

    /**
     * Liste des familles avec leurs statistiques et leur statut d'abonnement.
     */
    public function families()
    {
        $families = Family::query()
            ->with('owner:id,name,email')
            ->withCount(['members', 'memories', 'books'])
            ->get()
            ->map(fn (Family $family) => [
                'id' => $family->id,
                'name' => $family->name,
                'invite_code' => $family->invite_code,
                'owner' => $family->owner ? ['id' => $family->owner->id, 'name' => $family->owner->name, 'email' => $family->owner->email] : null,
                'members_count' => $family->members_count,
                'memories_count' => $family->memories_count,
                'books_count' => $family->books_count,
                'plan' => $family->currentPlan(),
                'created_at' => $family->created_at,
            ]);

        return response()->json($families);
    }

    /**
     * Renomme une famille (ou modifie d'autres informations à la demande).
     */
    public function updateFamily(Request $request, Family $family)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $family->update($validated);

        return response()->json($family);
    }

    /**
     * Liste des abonnements, actifs ou passés.
     */
    public function subscriptions()
    {
        $subscriptions = Subscription::query()
            ->with('family:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Subscription $sub) => [
                'id' => $sub->id,
                'family' => $sub->family ? ['id' => $sub->family->id, 'name' => $sub->family->name] : null,
                'plan' => $sub->plan,
                'status' => $sub->status,
                'payment_method' => $sub->payment_method,
                'price_cents' => $sub->price_cents,
                'currency' => $sub->currency,
                'price_chf' => round($this->toChf($sub->price_cents ?? 0, $sub->currency ?? 'CHF'), 2),
                'starts_at' => $sub->starts_at,
                'ends_at' => $sub->ends_at,
            ]);

        return response()->json($subscriptions);
    }

    /**
     * Liste des commandes de livres (PDF et papier), tous statuts confondus.
     */
    public function orders()
    {
        $orders = Order::query()
            ->with(['book:id,family_id,theme', 'book.family:id,name', 'user:id,name,email'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'family' => $order->book?->family ? ['id' => $order->book->family->id, 'name' => $order->book->family->name] : null,
                'user' => $order->user ? ['id' => $order->user->id, 'name' => $order->user->name, 'email' => $order->user->email] : null,
                'format' => $order->format,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'price_cents' => $order->price_cents,
                'currency' => $order->currency,
                'price_chf' => round($this->toChf($order->price_cents ?? 0, $order->currency ?? 'CHF'), 2),
                'created_at' => $order->created_at,
            ]);

        return response()->json($orders);
    }

    /**
     * Liste des administrateurs actuels (admins + super-admin).
     */
    public function admins()
    {
        $admins = User::where('is_admin', true)
            ->orWhere('is_super_admin', true)
            ->get(['id', 'name', 'email', 'is_admin', 'is_super_admin'])
            ->sortByDesc('is_super_admin')
            ->values();

        return response()->json($admins);
    }

    /**
     * Nomme un utilisateur existant comme administrateur. Réservé au super-administrateur.
     */
    public function promoteAdmin(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $validated['email'])->first();
        abort_if(! $user, 404, "Aucun compte avec cette adresse e-mail.");

        $user->forceFill(['is_admin' => true])->save();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'is_super_admin' => $user->is_super_admin,
        ]);
    }

    /**
     * Retire les droits d'administrateur d'un utilisateur. Réservé au super-administrateur ;
     * le compte super-administrateur lui-même ne peut pas être rétrogradé par cette route.
     */
    public function demoteAdmin(User $user)
    {
        abort_if($user->is_super_admin, 403, "Le super-administrateur ne peut pas être retiré.");

        $user->forceFill(['is_admin' => false])->save();

        return response()->json(['message' => 'Droits administrateur retirés.']);
    }
}

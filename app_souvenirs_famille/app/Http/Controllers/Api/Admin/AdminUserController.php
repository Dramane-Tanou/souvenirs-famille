<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Family;
use App\Models\Order;
use App\Models\User;
use App\Support\AgeRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Liste de tous les utilisateurs de l'application (pas seulement les
     * administrateurs), avec recherche par nom ou e-mail — pour retrouver un
     * membre, corriger ses informations ou retirer son compte.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->withCount('families')
            ->when($search !== '', fn ($query) => $query->where(
                fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")
            ))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return response()->json($users);
    }

    /**
     * Modifie les informations de base d'un utilisateur (nom, e-mail, date de
     * naissance, genre) — jamais son mot de passe ni ses droits d'admin, qui
     * passent par des flux dédiés (réinitialisation de mot de passe côté
     * utilisateur, promotion/déclassement via AdminController::promoteAdmin).
     *
     * Seul le super-administrateur racine peut modifier les informations
     * d'un compte administrateur ou super-administrateur (racine compris) —
     * un admin ou super-administrateur non racine ne doit pas pouvoir
     * toucher aux informations du racine ni de ses collègues admin/super-admin
     * depuis cette liste, même si techniquement il les voit tous.
     */
    public function update(Request $request, User $user)
    {
        abort_if(
            ($user->is_root_super_admin || $user->is_admin || $user->is_super_admin) && ! Auth::user()->is_root_super_admin,
            403,
            "Seul le super-administrateur racine peut modifier les informations d'un administrateur."
        );

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'birth_date' => ['sometimes', 'nullable', 'date', AgeRules::minBirthDateRule()],
            'gender' => ['sometimes', 'nullable', 'string', 'in:male,female,other'],
        ], [
            'birth_date.before_or_equal' => 'Cet utilisateur doit avoir au moins ' . AgeRules::minAgeYears() . ' ans.',
        ]);

        // email_verified_at n'est volontairement pas dans le Fillable du
        // modèle (voir User::class) : un update() mass-assigné l'ignorerait
        // silencieusement, d'où l'affectation directe de la propriété ici.
        if (array_key_exists('email', $validated) && $validated['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        $user->update($validated);

        return response()->json($user->loadCount('families'));
    }

    /**
     * Supprime définitivement un compte utilisateur. Réservé aux
     * super-administrateurs (action destructrice, même logique que la
     * suppression directe d'une famille). Le super-administrateur racine ne
     * peut jamais être supprimé, et seul lui-même peut supprimer un autre
     * compte super-administrateur.
     *
     * Un utilisateur propriétaire d'une famille ne peut pas être supprimé
     * directement : owner_id est en cascadeOnDelete, donc supprimer son
     * compte supprimerait toute la famille (photos, livres, autres membres
     * compris) — bien plus large que ce qu'un admin veut dire par "retirer
     * cet utilisateur". Avant suppression, les livres qu'il a créés et les
     * commandes qu'il a passées sont réattribués au propriétaire de la
     * famille concernée (created_by / user_id ne sont pas nullable, donc
     * cascaderaient sinon et feraient disparaître ce contenu/historique
     * inutilement). Ses souvenirs, likes, messages et jetons restent en
     * cascade normale : c'est le contenu qui lui appartient en propre.
     */
    public function destroy(User $user)
    {
        abort_if($user->is_root_super_admin, 403, "Le super-administrateur racine ne peut pas être supprimé.");
        abort_if(
            $user->is_super_admin && ! Auth::user()->is_root_super_admin,
            403,
            "Seul le super-administrateur racine peut supprimer un compte super-administrateur."
        );
        abort_if($user->id === Auth::id(), 403, "Tu ne peux pas supprimer ton propre compte depuis cette page.");

        if (Family::where('owner_id', $user->id)->exists()) {
            return response()->json([
                'message' => "Cet utilisateur est propriétaire d'au moins une famille — transfère la propriété ou supprime la famille avant de retirer ce compte.",
            ], 422);
        }

        DB::transaction(function () use ($user) {
            Book::where('created_by', $user->id)->get()->each(function (Book $book) {
                $book->update(['created_by' => $book->family->owner_id]);
            });

            Order::where('user_id', $user->id)->get()->each(function (Order $order) {
                $order->update(['user_id' => $order->book->family->owner_id]);
            });

            $user->delete();
        });

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }
}

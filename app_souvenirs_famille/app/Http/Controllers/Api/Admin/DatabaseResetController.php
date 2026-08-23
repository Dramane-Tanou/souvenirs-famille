<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;

/**
 * Réinitialisation complète de la base de données — action extrêmement
 * destructrice réservée au SEUL super-administrateur racine (pas les autres
 * super-administrateurs). Avant toute suppression, un nouveau
 * super-administrateur racine est créé avec les identifiants fournis, pour
 * que quelqu'un puisse se reconnecter une fois la base vidée — sans quoi
 * personne ne pourrait plus jamais accéder à l'administration.
 */
class DatabaseResetController extends Controller
{
    private const CONFIRM_PHRASE = 'SUPPRIMER TOUT';

    public function reset(Request $request)
    {
        $currentUser = Auth::user();
        abort_if(
            ! $currentUser->is_root_super_admin,
            403,
            "Seul le super-administrateur racine peut réinitialiser la base de données."
        );

        $validated = $request->validate([
            'new_root_email' => ['required', 'email', 'max:255'],
            'new_root_password' => ['required', 'string', 'min:8', 'confirmed'],
            // Deux confirmations distinctes, volontairement redondantes avec
            // le formulaire lui-même, pour qu'une réinitialisation ne puisse
            // jamais arriver par un clic accidentel ou précipité.
            'acknowledge' => ['required', 'accepted'],
            'confirm_phrase' => ['required', 'string'],
        ]);

        if ($validated['confirm_phrase'] !== self::CONFIRM_PHRASE) {
            return response()->json([
                'message' => 'Phrase de confirmation incorrecte — rien n\'a été supprimé.',
            ], 422);
        }

        // Reconstruit le schéma à partir des migrations plutôt que de vider
        // table par table : c'est la seule façon d'être certain de ne rien
        // oublier (et dans le bon ordre vis-à-vis des clés étrangères), les
        // migrations étant déjà la source de vérité du schéma.
        Artisan::call('migrate:fresh', ['--force' => true]);

        $newRoot = User::create([
            'name' => 'Super-administrateur',
            'email' => $validated['new_root_email'],
            'password' => $validated['new_root_password'],
        ]);

        // is_admin/is_super_admin/is_root_super_admin sont volontairement
        // exclus du mass-assignment (voir User::class) : seul un forceFill()
        // explicite, ici, peut les activer — jamais une simple création.
        $newRoot->forceFill([
            'is_admin' => true,
            'is_super_admin' => true,
            'is_root_super_admin' => true,
        ])->save();

        return response()->json([
            'message' => 'Base de données réinitialisée. Connecte-toi avec les nouveaux identifiants — ta session actuelle vient d\'être supprimée avec le reste.',
        ]);
    }
}

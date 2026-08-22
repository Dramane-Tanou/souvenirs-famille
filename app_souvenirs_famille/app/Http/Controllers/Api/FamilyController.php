<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class FamilyController extends Controller
{
    /**
     * Liste des familles de l'utilisateur connecté.
     */
    public function index(Request $request)
    {
        $families = $request->user()->families()
            ->withCount('memories')
            ->withMax('memories', 'memory_date')
            ->get();

        return response()->json($families);
    }

    /**
     * Créer un nouveau cercle familial. Le créateur devient admin.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        do {
            $inviteCode = strtoupper(Str::random(8));
        } while (Family::where('invite_code', $inviteCode)->exists());

        $family = Family::create([
            'name' => $validated['name'],
            'owner_id' => Auth::id(),
            'invite_code' => $inviteCode,
        ]);

        $family->members()->attach(Auth::id(), ['role' => 'admin', 'joined_at' => now()]);

        return response()->json($family, 201);
    }

    /**
     * Détail d'une famille avec ses membres.
     */
    public function show(Family $family)
    {
        $isMember = $family->members()->where('user_id', Auth::id())->exists();
        abort_if(! $isMember, 403, "Tu ne fais pas partie de cette famille.");

        $family->load('members:id,name,email,avatar_path');

        return response()->json($family);
    }

    /**
     * Rejoindre une famille existante via son code d'invitation.
     */
    public function join(Request $request)
    {
        $validated = $request->validate([
            'invite_code' => ['required', 'string'],
        ]);

        $family = Family::where('invite_code', strtoupper($validated['invite_code']))->first();

        if (! $family) {
            return response()->json(['message' => "Code d'invitation invalide."], 404);
        }

        if ($family->members()->where('user_id', Auth::id())->exists()) {
            return response()->json(['message' => 'Tu fais déjà partie de cette famille.'], 409);
        }

        $family->members()->attach(Auth::id(), ['role' => 'contributor', 'joined_at' => now()]);

        return response()->json($family, 201);
    }

    /**
     * Liste des membres d'une famille, avec leur nombre de souvenirs ajoutés.
     */
    public function members(Family $family)
    {
        $this->authorizeFamilyMember($family);

        $members = $family->members()
            ->withCount(['memories' => fn ($query) => $query->where('family_id', $family->id)])
            ->get();

        return response()->json($members);
    }

    /**
     * Profil d'un membre au sein d'une famille : infos + statistiques.
     */
    public function showMember(Family $family, User $user)
    {
        $this->authorizeFamilyMember($family);

        $pivot = $family->members()->where('user_id', $user->id)->first()?->pivot;
        abort_if(! $pivot, 404, "Ce membre ne fait pas partie de cette famille.");

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'avatar_path' => $user->avatar_path,
            'role' => $pivot->role,
            'joined_at' => $pivot->joined_at,
            'memories_count' => $family->memories()->where('user_id', $user->id)->count(),
        ]);
    }

    private function authorizeFamilyMember(Family $family): void
    {
        $isMember = $family->members()->where('user_id', Auth::id())->exists();

        if (! $isMember) {
            abort(403, "Tu ne fais pas partie de cette famille.");
        }
    }
}
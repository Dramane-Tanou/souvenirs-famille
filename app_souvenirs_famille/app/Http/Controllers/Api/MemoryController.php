<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\Memory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class MemoryController extends Controller
{
    /**
     * Fil chronologique des souvenirs d'une famille.
     * Filtrable par auteur via le paramètre optionnel `user_id`.
     */
    public function index(Request $request, Family $family)
    {
        $this->authorizeFamilyMember($family);

        $memories = $family->memories()
            ->when($request->filled('user_id'), fn ($query) => $query->where('user_id', $request->integer('user_id')))
            ->with('user:id,name,avatar_path')
            ->withCount('likes')
            ->withExists(['likes as liked_by_me' => fn ($query) => $query->where('user_id', Auth::id())])
            ->orderByDesc('memory_date')
            ->paginate(20);

        return response()->json($memories);
    }

    /**
     * Ajouter la photo du jour.
     */
    public function store(Request $request, Family $family)
    {
        $this->authorizeFamilyMember($family);

        if ($family->currentPlan() === 'free') {
            $maxPhotos = config('plans.free.max_photos');
            $currentCount = $family->memories()->count();

            if ($currentCount >= $maxPhotos) {
                return response()->json([
                    'message' => "Le plan gratuit est limité à {$maxPhotos} photos. Passe au plan Famille pour continuer à ajouter des souvenirs.",
                ], 403);
            }
        }

        $validated = $request->validate([
    'photo' => ['required', 'file', 'mimes:jpeg,jpg,png,gif,webp,bmp,heic,heif', 'max:20480'], // 20 Mo max
    'caption' => ['nullable', 'string', 'max:500'],
    'memory_date' => ['nullable', 'date'],
    'focal_x' => ['nullable', 'integer', 'min:0', 'max:100'],
    'focal_y' => ['nullable', 'integer', 'min:0', 'max:100'],
]);

        $path = $request->file('photo')->store("memories/{$family->id}", 'public');

        $memory = Memory::create([
            'family_id' => $family->id,
            'user_id' => Auth::id(),
            'image_path' => $path,
            'caption' => $validated['caption'] ?? null,
            'memory_date' => $validated['memory_date'] ?? now()->toDateString(),
            'focal_x' => $validated['focal_x'] ?? 50,
            'focal_y' => $validated['focal_y'] ?? 50,
        ]);

        return response()->json($memory->load('user:id,name,avatar_path'), 201);
    }

    /**
     * Fonction "Ce jour-là" : souvenirs des années précédentes, même jour/mois.
     */
    public function onThisDay(Request $request, Family $family)
    {
        $this->authorizeFamilyMember($family);

        $today = now();

        $memories = $family->memories()
            ->with('user:id,name,avatar_path')
            ->whereMonth('memory_date', $today->month)
            ->whereDay('memory_date', $today->day)
            ->whereYear('memory_date', '<', $today->year)
            ->orderByDesc('memory_date')
            ->get();

        return response()->json($memories);
    }

    /**
     * Supprimer un souvenir (auteur ou admin de la famille uniquement).
     */
    public function destroy(Request $request, Family $family, Memory $memory)
    {
        $this->authorizeFamilyMember($family);

        $pivot = $family->members()->where('user_id', Auth::id())->first()?->pivot;
        $isAdmin = $pivot && $pivot->role === 'admin';

        if ($memory->user_id !== Auth::id() && ! $isAdmin) {
            abort(403, "Tu ne peux supprimer que tes propres souvenirs.");
        }

        Storage::disk('public')->delete($memory->image_path);
        $memory->delete();

        return response()->json(['message' => 'Souvenir supprimé.']);
    }

    /**
     * Bascule le like de l'utilisateur connecté sur ce souvenir.
     */
    public function toggleLike(Request $request, Family $family, Memory $memory)
    {
        $this->authorizeFamilyMember($family);
        abort_if($memory->family_id !== $family->id, 404);

        $like = $memory->likes()->where('user_id', Auth::id())->first();

        if ($like) {
            $like->delete();
        } else {
            $memory->likes()->create(['user_id' => Auth::id()]);
        }

        return response()->json([
            'likes_count' => $memory->likes()->count(),
            'liked_by_me' => ! $like,
        ]);
    }

    /**
     * Liste des personnes ayant aimé ce souvenir.
     */
    public function likers(Request $request, Family $family, Memory $memory)
    {
        $this->authorizeFamilyMember($family);
        abort_if($memory->family_id !== $family->id, 404);

        $likers = $memory->likes()
            ->with('user:id,name,avatar_path')
            ->latest()
            ->get()
            ->pluck('user');

        return response()->json($likers);
    }

    /**
     * Vérifie que l'utilisateur connecté fait partie de la famille.
     */
    private function authorizeFamilyMember(Family $family): void
    {
        $isMember = $family->members()->where('user_id', Auth::id())->exists();

        if (! $isMember) {
            abort(403, "Tu ne fais pas partie de cette famille.");
        }
    }


    /**
 * Modifier la légende d'un souvenir (auteur ou admin de la famille uniquement).
 */
public function update(Request $request, Family $family, Memory $memory)
{
    $this->authorizeFamilyMember($family);

    $pivot = $family->members()->where('user_id', Auth::id())->first()?->pivot;
    $isAdmin = $pivot && $pivot->role === 'admin';

    if ($memory->user_id !== Auth::id() && ! $isAdmin) {
        abort(403, "Tu ne peux modifier que tes propres souvenirs.");
    }

    $validated = $request->validate([
        'caption' => ['sometimes', 'nullable', 'string', 'max:500'],
        'focal_x' => ['sometimes', 'integer', 'min:0', 'max:100'],
        'focal_y' => ['sometimes', 'integer', 'min:0', 'max:100'],
    ]);

    $memory->update($validated);

    return response()->json($memory->load('user:id,name,avatar_path'));
}
}
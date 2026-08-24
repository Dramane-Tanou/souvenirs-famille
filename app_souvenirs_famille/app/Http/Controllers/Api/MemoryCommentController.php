<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\Memory;
use App\Models\MemoryComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MemoryCommentController extends Controller
{
    /**
     * Liste des commentaires d'une photo, du plus ancien au plus récent.
     */
    public function index(Request $request, Family $family, Memory $memory)
    {
        $this->authorizeFamilyMember($family);
        abort_if($memory->family_id !== $family->id, 404);

        $comments = $memory->comments()
            ->with('user:id,first_name,name,avatar_path')
            ->orderBy('created_at')
            ->get();

        return response()->json($comments);
    }

    /**
     * Ajouter un commentaire sur une photo.
     */
    public function store(Request $request, Family $family, Memory $memory)
    {
        $this->authorizeFamilyMember($family);
        abort_if($memory->family_id !== $family->id, 404);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:1000'],
        ]);

        $comment = MemoryComment::create([
            'memory_id' => $memory->id,
            'user_id' => Auth::id(),
            'body' => $validated['body'],
        ]);

        return response()->json($comment->load('user:id,first_name,name,avatar_path'), 201);
    }

    /**
     * Supprimer un commentaire (auteur ou admin de la famille uniquement).
     */
    public function destroy(Request $request, Family $family, Memory $memory, MemoryComment $comment)
    {
        $this->authorizeFamilyMember($family);
        abort_if($memory->family_id !== $family->id, 404);
        abort_if($comment->memory_id !== $memory->id, 404);

        $pivot = $family->members()->where('user_id', Auth::id())->first()?->pivot;
        $isAdmin = $pivot && $pivot->role === 'admin';

        if ($comment->user_id !== Auth::id() && ! $isAdmin) {
            abort(403, "Tu ne peux supprimer que tes propres commentaires.");
        }

        $comment->delete();

        return response()->json(['message' => 'Commentaire supprimé.']);
    }

    private function authorizeFamilyMember(Family $family): void
    {
        $isMember = $family->members()->where('user_id', Auth::id())->exists();

        if (! $isMember) {
            abort(403, "Tu ne fais pas partie de cette famille.");
        }
    }
}

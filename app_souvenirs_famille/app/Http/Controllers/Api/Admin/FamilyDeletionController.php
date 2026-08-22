<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\FamilyDeletionRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class FamilyDeletionController extends Controller
{
    /**
     * Supprime une famille et toutes ses données (souvenirs, livres, commandes,
     * abonnement, invitations) — les suppressions en cascade sont définies au
     * niveau de la base de données ; seuls les fichiers de souvenirs stockés
     * sur le disque doivent être nettoyés manuellement ici.
     */
    private function deleteFamily(Family $family): void
    {
        foreach ($family->memories()->pluck('image_path') as $path) {
            Storage::disk('public')->delete($path);
        }

        $family->delete();
    }

    private function requestPayload(FamilyDeletionRequest $r): array
    {
        return [
            'id' => $r->id,
            'type' => $r->type,
            'family_id' => $r->family_id,
            'family_name' => $r->family_name,
            'target_user_id' => $r->target_user_id,
            'target_user_name' => $r->target_user_name,
            'requester' => $r->requester ? ['id' => $r->requester->id, 'name' => $r->requester->name, 'email' => $r->requester->email] : null,
            'reason' => $r->reason,
            'status' => $r->status,
            'reviewer' => $r->reviewer ? ['id' => $r->reviewer->id, 'name' => $r->reviewer->name] : null,
            'review_note' => $r->review_note,
            'reviewed_at' => $r->reviewed_at,
            'created_at' => $r->created_at,
        ];
    }

    /**
     * Un administrateur (non super-admin) demande la suppression d'une famille,
     * en justifiant la raison (règles non respectées). Nécessite l'accord du
     * super-administrateur avant que la suppression n'ait lieu.
     */
    public function requestDeletion(Request $request, Family $family)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        $existing = FamilyDeletionRequest::where('family_id', $family->id)
            ->where('type', 'family_deletion')
            ->where('status', 'pending')
            ->exists();
        abort_if($existing, 409, "Une demande de suppression est déjà en attente pour cette famille.");

        $deletionRequest = FamilyDeletionRequest::create([
            'type' => 'family_deletion',
            'family_id' => $family->id,
            'family_name' => $family->name,
            'requested_by' => Auth::id(),
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return response()->json($this->requestPayload($deletionRequest), 201);
    }

    /**
     * Un administrateur (non super-admin) demande le retrait d'un membre d'une
     * famille. Nécessite l'accord du super-administrateur.
     */
    public function requestMemberRemoval(Request $request, Family $family, User $user)
    {
        $isMember = $family->members()->where('user_id', $user->id)->exists();
        abort_if(! $isMember, 404, "Ce membre ne fait pas partie de cette famille.");

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        $existing = FamilyDeletionRequest::where('family_id', $family->id)
            ->where('target_user_id', $user->id)
            ->where('type', 'member_removal')
            ->where('status', 'pending')
            ->exists();
        abort_if($existing, 409, "Une demande de retrait est déjà en attente pour ce membre.");

        $removalRequest = FamilyDeletionRequest::create([
            'type' => 'member_removal',
            'family_id' => $family->id,
            'family_name' => $family->name,
            'target_user_id' => $user->id,
            'target_user_name' => $user->name,
            'requested_by' => Auth::id(),
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return response()->json($this->requestPayload($removalRequest), 201);
    }

    /**
     * Liste complète des demandes (suppressions de famille + retraits de
     * membre), tous statuts confondus. Réservé au super-administrateur.
     */
    public function index()
    {
        $requests = FamilyDeletionRequest::query()
            ->with(['requester:id,name,email', 'reviewer:id,name,email'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (FamilyDeletionRequest $r) => $this->requestPayload($r));

        return response()->json($requests);
    }

    /**
     * Liste des demandes soumises par l'administrateur connecté, pour qu'il
     * puisse voir la décision du super-administrateur sans avoir un accès
     * complet à l'historique de tous les autres.
     */
    public function myRequests()
    {
        $requests = FamilyDeletionRequest::query()
            ->where('requested_by', Auth::id())
            ->with(['requester:id,name,email', 'reviewer:id,name,email'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (FamilyDeletionRequest $r) => $this->requestPayload($r));

        return response()->json($requests);
    }

    /**
     * Approuve une demande : supprime réellement la famille, ou retire
     * réellement le membre concerné selon le type de la demande.
     * Réservé au super-administrateur.
     */
    public function approve(FamilyDeletionRequest $deletionRequest)
    {
        abort_if($deletionRequest->status !== 'pending', 409, 'Cette demande a déjà été traitée.');

        if ($deletionRequest->type === 'member_removal') {
            if ($deletionRequest->family && $deletionRequest->target_user_id) {
                $deletionRequest->family->members()->detach($deletionRequest->target_user_id);
            }
            $message = 'Membre retiré de la famille.';
        } else {
            if ($deletionRequest->family) {
                $this->deleteFamily($deletionRequest->family);
            }
            $message = 'Famille supprimée.';
        }

        $deletionRequest->update([
            'status' => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        return response()->json(['message' => $message]);
    }

    /**
     * Rejette une demande, sans toucher à la famille ni au membre concerné.
     * Réservé au super-administrateur.
     */
    public function reject(Request $request, FamilyDeletionRequest $deletionRequest)
    {
        abort_if($deletionRequest->status !== 'pending', 409, 'Cette demande a déjà été traitée.');

        $validated = $request->validate([
            'review_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $deletionRequest->update([
            'status' => 'rejected',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
            'review_note' => $validated['review_note'] ?? null,
        ]);

        return response()->json(['message' => 'Demande rejetée.']);
    }

    /**
     * Suppression directe d'une famille, sans approbation — réservée au super-administrateur.
     * Journalisée dans le même historique que les demandes classiques, déjà approuvée.
     */
    public function destroyDirect(Request $request, Family $family)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        FamilyDeletionRequest::create([
            'type' => 'family_deletion',
            'family_id' => $family->id,
            'family_name' => $family->name,
            'requested_by' => Auth::id(),
            'reason' => $validated['reason'],
            'status' => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        // La suppression de la famille ci-dessous déclenche le nullOnDelete
        // sur family_id de la ligne créée juste au-dessus, tout en conservant
        // family_name pour l'historique.
        $this->deleteFamily($family);

        return response()->json(['message' => 'Famille supprimée.']);
    }

    /**
     * Retrait direct d'un membre, sans approbation — réservé au super-administrateur.
     * Journalisé dans le même historique, déjà approuvé.
     */
    public function removeMemberDirect(Request $request, Family $family, User $user)
    {
        $isMember = $family->members()->where('user_id', $user->id)->exists();
        abort_if(! $isMember, 404, "Ce membre ne fait pas partie de cette famille.");

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        FamilyDeletionRequest::create([
            'type' => 'member_removal',
            'family_id' => $family->id,
            'family_name' => $family->name,
            'target_user_id' => $user->id,
            'target_user_name' => $user->name,
            'requested_by' => Auth::id(),
            'reason' => $validated['reason'],
            'status' => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        $family->members()->detach($user->id);

        return response()->json(['message' => 'Membre retiré de la famille.']);
    }
}

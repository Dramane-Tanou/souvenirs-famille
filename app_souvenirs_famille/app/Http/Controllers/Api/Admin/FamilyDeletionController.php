<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\FamilyDeletionRequest;
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
            ->where('status', 'pending')
            ->exists();
        abort_if($existing, 409, "Une demande de suppression est déjà en attente pour cette famille.");

        $deletionRequest = FamilyDeletionRequest::create([
            'family_id' => $family->id,
            'family_name' => $family->name,
            'requested_by' => Auth::id(),
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return response()->json($deletionRequest, 201);
    }

    /**
     * Liste des demandes de suppression (historique complet). Réservé au super-administrateur.
     */
    public function index()
    {
        $requests = FamilyDeletionRequest::query()
            ->with(['requester:id,name,email', 'reviewer:id,name,email'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (FamilyDeletionRequest $r) => [
                'id' => $r->id,
                'family_id' => $r->family_id,
                'family_name' => $r->family_name,
                'requester' => $r->requester ? ['id' => $r->requester->id, 'name' => $r->requester->name, 'email' => $r->requester->email] : null,
                'reason' => $r->reason,
                'status' => $r->status,
                'reviewer' => $r->reviewer ? ['id' => $r->reviewer->id, 'name' => $r->reviewer->name] : null,
                'review_note' => $r->review_note,
                'reviewed_at' => $r->reviewed_at,
                'created_at' => $r->created_at,
            ]);

        return response()->json($requests);
    }

    /**
     * Approuve une demande de suppression : supprime réellement la famille.
     * Réservé au super-administrateur.
     */
    public function approve(FamilyDeletionRequest $deletionRequest)
    {
        abort_if($deletionRequest->status !== 'pending', 409, 'Cette demande a déjà été traitée.');

        if ($deletionRequest->family) {
            $this->deleteFamily($deletionRequest->family);
        }

        $deletionRequest->update([
            'status' => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        return response()->json(['message' => 'Famille supprimée.']);
    }

    /**
     * Rejette une demande de suppression, sans toucher à la famille.
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
}

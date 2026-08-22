<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ContactMessageController extends Controller
{
    /**
     * Supprime les messages vieux de plus de 24h — nettoyage à la volée,
     * déclenché à chaque consultation de la liste par un administrateur
     * (pas de tâche planifiée dédiée sur cet hébergement).
     */
    private function pruneExpired(): void
    {
        ContactMessage::where('created_at', '<', now()->subDay())->delete();
    }

    /**
     * Liste des messages reçus des utilisateurs, avec leurs coordonnées
     * (e-mail et/ou téléphone) pour que l'administration puisse les recontacter.
     */
    public function index()
    {
        $this->pruneExpired();

        $messages = ContactMessage::query()
            ->with('user:id,name,email,phone')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ContactMessage $m) => [
                'id' => $m->id,
                'user' => $m->user ? [
                    'id' => $m->user->id,
                    'name' => $m->user->name,
                    'email' => $m->user->email,
                    'phone' => $m->user->phone,
                ] : null,
                'message' => $m->message,
                'status' => $m->status,
                'admin_reply' => $m->admin_reply,
                'replied_at' => $m->replied_at,
                'created_at' => $m->created_at,
            ]);

        return response()->json($messages);
    }

    /**
     * Répond à un message — visible ensuite par l'utilisateur qui l'a envoyé.
     */
    public function reply(Request $request, ContactMessage $contactMessage)
    {
        $validated = $request->validate([
            'admin_reply' => ['required', 'string', 'max:2000'],
        ]);

        $contactMessage->update([
            'admin_reply' => $validated['admin_reply'],
            'status' => 'answered',
            'replied_by' => Auth::id(),
            'replied_at' => now(),
        ]);

        return response()->json(['message' => 'Réponse envoyée.']);
    }
}

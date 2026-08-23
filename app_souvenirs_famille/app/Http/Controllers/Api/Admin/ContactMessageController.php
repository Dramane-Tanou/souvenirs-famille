<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ContactMessageController extends Controller
{
    /**
     * Liste des conversations — une par utilisateur ayant écrit à
     * l'administration, avec un aperçu du dernier message, pour un affichage
     * façon boîte de réception (comme une appli de messagerie).
     */
    public function index()
    {
        $messages = ContactMessage::query()
            ->with('user:id,name,email,phone,avatar_path')
            ->orderByDesc('created_at')
            ->get();

        $conversations = $messages->groupBy('user_id')->map(function ($group) {
            $last = $group->first(); // déjà trié par created_at desc

            return [
                'user' => $last->user ? [
                    'id' => $last->user->id,
                    'name' => $last->user->name,
                    'email' => $last->user->email,
                    'phone' => $last->user->phone,
                    'avatar_path' => $last->user->avatar_path,
                ] : null,
                'last_message' => [
                    'body' => $last->body,
                    'has_image' => (bool) $last->image_path,
                    'sender_id' => $last->sender_id,
                    'created_at' => $last->created_at,
                ],
                'message_count' => $group->count(),
            ];
        })->sortByDesc(fn ($c) => $c['last_message']['created_at'])->values();

        return response()->json($conversations);
    }

    /**
     * Fil de conversation complet avec un utilisateur précis.
     */
    public function show(User $user)
    {
        $messages = ContactMessage::where('user_id', $user->id)
            ->with('sender:id,name,is_admin,is_super_admin,avatar_path')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
            ],
            'messages' => $messages,
        ]);
    }

    /**
     * Répond dans le fil de conversation d'un utilisateur (texte et/ou image).
     */
    public function reply(Request $request, User $user)
    {
        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'], // 10 Mo max
        ]);

        if (empty($validated['body']) && ! $request->hasFile('image')) {
            abort(422, "Écris un message ou joins une image.");
        }

        $imagePath = $request->hasFile('image')
            ? $request->file('image')->store('contact-messages/' . $user->id, 'public')
            : null;

        $message = ContactMessage::create([
            'user_id' => $user->id,
            'sender_id' => Auth::id(),
            'body' => $validated['body'] ?? null,
            'image_path' => $imagePath,
        ]);

        return response()->json($message->load('sender:id,name,is_admin,is_super_admin,avatar_path'), 201);
    }

    /**
     * Efface toute la conversation avec un utilisateur — une fois que
     * l'administration considère l'échange terminé. Supprime aussi les
     * images jointes du stockage.
     */
    public function destroy(User $user)
    {
        $messages = ContactMessage::where('user_id', $user->id)->get();

        foreach ($messages as $message) {
            if ($message->image_path) {
                Storage::disk('public')->delete($message->image_path);
            }
        }

        ContactMessage::where('user_id', $user->id)->delete();

        return response()->json(['message' => 'Conversation supprimée.']);
    }
}

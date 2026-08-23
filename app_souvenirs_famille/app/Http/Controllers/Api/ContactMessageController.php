<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Support\TypingIndicator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ContactMessageController extends Controller
{
    /**
     * Envoie un message dans le fil de conversation avec l'administration
     * (texte et/ou image — ex : demande de retrait d'un membre ou de
     * suppression d'une famille, avec justification).
     */
    public function store(Request $request)
    {
        $validated = $this->validateMessage($request);

        $imagePath = $request->hasFile('image')
            ? $request->file('image')->store('contact-messages/' . Auth::id(), 'public')
            : null;

        $message = ContactMessage::create([
            'user_id' => Auth::id(),
            'sender_id' => Auth::id(),
            'body' => $validated['body'] ?? null,
            'image_path' => $imagePath,
        ]);

        return response()->json($message->load('sender:id,name,is_admin,is_super_admin,avatar_path'), 201);
    }

    /**
     * Le fil de conversation complet de l'utilisateur connecté avec
     * l'administration, dans l'ordre chronologique.
     */
    public function mine()
    {
        $messages = ContactMessage::where('user_id', Auth::id())
            ->with('sender:id,name,is_admin,is_super_admin,avatar_path')
            ->orderBy('created_at')
            ->get();

        return response()->json($messages);
    }

    /**
     * Signale que l'utilisateur connecté est en train d'écrire dans son fil
     * de conversation — à appeler (avec parcimonie côté client) pendant la
     * saisie, jamais à l'envoi du message.
     */
    public function typing()
    {
        TypingIndicator::markCustomerTyping(Auth::id());

        return response()->json(['ok' => true]);
    }

    /**
     * Est-ce qu'un membre de l'administration est en train d'écrire dans le
     * fil de conversation de l'utilisateur connecté ?
     */
    public function typingStatus()
    {
        return response()->json(['typing' => TypingIndicator::isAdminTyping(Auth::id())]);
    }

    private function validateMessage(Request $request): array
    {
        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'], // 10 Mo max
        ]);

        if (empty($validated['body']) && ! $request->hasFile('image')) {
            abort(422, "Écris un message ou joins une image.");
        }

        return $validated;
    }
}

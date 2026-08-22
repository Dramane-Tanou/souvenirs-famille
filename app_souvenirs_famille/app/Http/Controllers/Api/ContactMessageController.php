<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ContactMessageController extends Controller
{
    /**
     * Envoie un message à l'équipe d'administration (ex : demande de retrait
     * d'un membre ou de suppression d'une famille, avec justification).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $message = ContactMessage::create([
            'user_id' => Auth::id(),
            'message' => $validated['message'],
            'status' => 'open',
        ]);

        return response()->json($message, 201);
    }

    /**
     * Messages envoyés par l'utilisateur connecté, avec la réponse de
     * l'administration si elle existe déjà.
     */
    public function mine()
    {
        $messages = ContactMessage::where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->get(['id', 'message', 'status', 'admin_reply', 'replied_at', 'created_at']);

        return response()->json($messages);
    }
}

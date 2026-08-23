<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'sender_id', 'body', 'image_path'])]
class ContactMessage extends Model
{
    /**
     * Le propriétaire du fil de conversation (le client) — pas forcément
     * l'auteur de CE message précis, voir sender().
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Qui a écrit ce message : le client lui-même, ou un membre de
     * l'administration qui répond dans son fil.
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}

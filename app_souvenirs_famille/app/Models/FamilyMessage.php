<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['family_id', 'sender_id', 'body', 'image_path', 'mentioned_user_ids'])]
class FamilyMessage extends Model
{
    protected function casts(): array
    {
        return [
            'mentioned_user_ids' => 'array',
        ];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}

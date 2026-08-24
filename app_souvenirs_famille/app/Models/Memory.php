<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['family_id', 'user_id', 'image_path', 'thumbnail_path', 'caption', 'memory_date', 'focal_x', 'focal_y', 'zoom'])]
class Memory extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'memory_date' => 'date',
            'focal_x' => 'integer',
            'focal_y' => 'integer',
            'zoom' => 'float',
        ];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(MemoryLike::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(MemoryComment::class);
    }
}
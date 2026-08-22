<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Family extends Model
{
    protected $fillable = ['name', 'owner_id', 'invite_code'];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'family_user')
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(FamilyInvitation::class);
    }

        public function memories(): HasMany
    {
        return $this->hasMany(Memory::class);
    }

    public function books(): HasMany
    {
        return $this->hasMany(Book::class);
    }


    /**
 * Retourne le plan effectif de la famille ('free' par défaut si aucun
 * abonnement n'existe encore, ou si l'abonnement payant n'est plus actif).
 */
    public function subscription(): HasOne
{
    return $this->hasOne(Subscription::class); 
}

public function currentPlan(): string
{
    $subscription = $this->subscription;

    if (! $subscription || $subscription->status !== 'active') {
        return 'free';
    }

    return $subscription->plan;
}

}










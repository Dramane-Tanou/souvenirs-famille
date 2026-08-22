<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    private const PROVIDER_COLUMN = [
        'google' => 'google_id',
        'facebook' => 'facebook_id',
        'apple' => 'apple_id',
    ];

    /**
     * Redirige le navigateur vers l'écran de connexion du fournisseur choisi.
     */
    public function redirect(string $provider): RedirectResponse
    {
        return Socialite::driver($provider)->stateless()->redirect();
    }

    /**
     * Retour du fournisseur : trouve ou crée le compte, puis redirige vers le
     * frontend avec un token Sanctum en paramètre de requête.
     */
    public function callback(string $provider): RedirectResponse
    {
        $frontendUrl = rtrim(config('app.frontend_url'), '/');
        $column = self::PROVIDER_COLUMN[$provider];

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            return redirect("{$frontendUrl}/auth/callback?error=" . urlencode($e->getMessage()));
        }

        $user = User::where($column, $socialUser->getId())->first();

        if (! $user && $socialUser->getEmail()) {
            $user = User::where('email', $socialUser->getEmail())->first();
        }

        if (! $user) {
            $user = User::create([
                'name' => $socialUser->getName() ?? $socialUser->getNickname() ?? ucfirst($provider) . ' user',
                'email' => $socialUser->getEmail() ?? "{$provider}_{$socialUser->getId()}@{$provider}.souvenirs-famille.local",
                'password' => Hash::make(Str::random(40)),
                $column => $socialUser->getId(),
            ]);
        } elseif (! $user->{$column}) {
            $user->update([$column => $socialUser->getId()]);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return redirect("{$frontendUrl}/auth/callback?token={$token}");
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Contracts\SmsSender;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PhoneAuthController extends Controller
{
    private const CODE_TTL_MINUTES = 10;

    /**
     * Génère un code à 6 chiffres et l'envoie par SMS (simulé en local via les logs).
     */
    public function requestCode(Request $request)
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
        ]);

        $phone = $validated['phone'];
        $code = (string) random_int(100000, 999999);

        Cache::put("phone_otp:{$phone}", $code, now()->addMinutes(self::CODE_TTL_MINUTES));

        app(SmsSender::class)->send($phone, "Ton code Souvenirs Famille : {$code}");

        $response = ['message' => 'Code envoyé.'];

        if (config('app.debug')) {
            $response['debug_code'] = $code;
        }

        return response()->json($response);
    }

    /**
     * Vérifie le code reçu et connecte l'utilisateur, ou crée son compte
     * si le numéro est inconnu et qu'un nom a été fourni.
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'code' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $phone = $validated['phone'];
        $cachedCode = Cache::get("phone_otp:{$phone}");

        if (! $cachedCode || $cachedCode !== $validated['code']) {
            return response()->json(['message' => 'Code invalide ou expiré.'], 422);
        }

        $user = User::where('phone', $phone)->first();

        if (! $user) {
            if (empty($validated['name'])) {
                return response()->json([
                    'message' => 'Nouveau numéro, un nom est nécessaire pour créer le compte.',
                    'is_new' => true,
                ], 422);
            }

            $user = User::create([
                'name' => $validated['name'],
                'email' => "{$phone}@phone.souvenirs-famille.local",
                'phone' => $phone,
                'password' => Hash::make(Str::random(40)),
            ]);
        }

        Cache::forget("phone_otp:{$phone}");

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }
}

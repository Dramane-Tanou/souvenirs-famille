<?php

namespace App\Http\Controllers\Api;

use App\Contracts\SmsSender;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AgeRules;
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
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date', 'before:today', AgeRules::minBirthDateRule()],
            'gender' => ['nullable', 'in:male,female,other'],
        ], [
            'birth_date.before_or_equal' => 'Vous devez avoir au moins ' . AgeRules::minAgeYears() . ' ans pour créer un compte.',
        ]);

        $phone = $validated['phone'];
        $cachedCode = Cache::get("phone_otp:{$phone}");

        if (! $cachedCode || $cachedCode !== $validated['code']) {
            return response()->json(['message' => 'Code invalide ou expiré.'], 422);
        }

        $user = User::where('phone', $phone)->first();

        if (! $user) {
            if (empty($validated['first_name']) || empty($validated['last_name']) || empty($validated['birth_date']) || empty($validated['gender'])) {
                return response()->json([
                    'message' => 'Nouveau numéro, un prénom, un nom, une date de naissance et un genre sont nécessaires pour créer le compte.',
                    'is_new' => true,
                ], 422);
            }

            $user = User::create([
                'name' => "{$validated['first_name']} {$validated['last_name']}",
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => "{$phone}@phone.souvenirs-famille.local",
                'phone' => $phone,
                'password' => Hash::make(Str::random(40)),
                'birth_date' => $validated['birth_date'],
                'gender' => $validated['gender'],
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

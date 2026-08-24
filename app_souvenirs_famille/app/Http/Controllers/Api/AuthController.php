<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AgeRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Inscription d'un nouvel utilisateur.
     * Retourne l'utilisateur créé + un token d'accès à utiliser pour les requêtes suivantes.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            // le champ 'password_confirmation' doit être envoyé en parallèle
            'birth_date' => ['required', 'date', 'before:today', AgeRules::minBirthDateRule()],
            'gender' => ['required', 'in:male,female,other'],
            'country' => ['required', 'string', 'regex:/^[A-Z]{2}$/'],
            'city' => ['required', 'string', 'max:255'],
        ], [
            'birth_date.before_or_equal' => 'Vous devez avoir au moins ' . AgeRules::minAgeYears() . ' ans pour créer un compte.',
            'country.regex' => 'Le pays sélectionné est invalide.',
        ]);

        $user = User::create([
            'name' => "{$validated['first_name']} {$validated['last_name']}",
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'birth_date' => $validated['birth_date'],
            'gender' => $validated['gender'],
            'country' => $validated['country'],
            'city' => $validated['city'],
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Connexion. Retourne un nouveau token d'accès.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ["Identifiants incorrects."],
            ]);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Déconnexion : révoque le token utilisé pour la requête actuelle.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    /**
     * Retourne l'utilisateur actuellement connecté (utile pour vérifier un token côté mobile).
     */
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    /**
 * Modifier son propre profil (nom, date de naissance).
 */
public function updateProfile(Request $request)
{
    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'birth_date' => ['nullable', 'date', 'before:today', AgeRules::minBirthDateRule()],
        'gender' => ['nullable', 'in:male,female,other'],
        'country' => ['nullable', 'string', 'regex:/^[A-Z]{2}$/'],
        'city' => ['nullable', 'string', 'max:255'],
    ], [
        'birth_date.before_or_equal' => 'Vous devez avoir au moins ' . AgeRules::minAgeYears() . ' ans.',
        'country.regex' => 'Le pays sélectionné est invalide.',
    ]);

    // Garde first_name/last_name synchronisés (utilisés pour l'affichage court côté tableau de bord).
    $parts = explode(' ', $validated['name'], 2);
    $validated['first_name'] = $parts[0];
    $validated['last_name'] = $parts[1] ?? '';

    $user = $request->user();
    $user->update($validated);

    return response()->json($user);
}

/**
 * Change la photo de profil de l'utilisateur connecté.
 */
public function uploadAvatar(Request $request)
{
    $validated = $request->validate([
        'avatar' => ['required', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'], // 10 Mo max
    ]);

    $user = $request->user();

    if ($user->avatar_path) {
        Storage::disk('public')->delete($user->avatar_path);
    }

    $path = $validated['avatar']->store('avatars', 'public');
    $user->update(['avatar_path' => $path]);

    return response()->json($user);
}

/**
 * Retire la photo de profil de l'utilisateur connecté.
 */
public function deleteAvatar(Request $request)
{
    $user = $request->user();

    if ($user->avatar_path) {
        Storage::disk('public')->delete($user->avatar_path);
        $user->update(['avatar_path' => null]);
    }

    return response()->json($user);
}

/**
 * Anniversaires à venir (J-7, J-1 ou jour J) parmi les membres des familles de l'utilisateur connecté.
 */
public function upcomingBirthdays(Request $request)
{
    $reminderDays = [0, 1, 7];
    $today = now()->startOfDay();
    $families = $request->user()->families()->with('members')->get();

    $upcoming = [];

    foreach ($families as $family) {
        foreach ($family->members as $member) {
            if (! $member->birth_date) {
                continue;
            }

            $nextBirthday = $member->birth_date->copy()->setYear($today->year);
            if ($nextBirthday->lt($today)) {
                $nextBirthday->addYear();
            }

            $daysUntil = (int) $today->diffInDays($nextBirthday);

            if (in_array($daysUntil, $reminderDays, true)) {
                $upcoming[] = [
                    'user' => ['id' => $member->id, 'name' => $member->name],
                    'family' => ['id' => $family->id, 'name' => $family->name],
                    'birth_date' => $member->birth_date->toDateString(),
                    'days_until' => $daysUntil,
                    'turning_age' => $nextBirthday->year - $member->birth_date->year,
                ];
            }
        }
    }

    usort($upcoming, fn ($a, $b) => $a['days_until'] <=> $b['days_until']);

    return response()->json($upcoming);
}

}
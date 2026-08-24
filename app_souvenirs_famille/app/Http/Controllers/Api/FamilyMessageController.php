<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\FamilyMessage;
use App\Support\TypingIndicator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FamilyMessageController extends Controller
{
    /**
     * Le fil de discussion complet de la famille, dans l'ordre chronologique.
     */
    public function index(Family $family)
    {
        $this->authorizeFamilyMember($family);

        $messages = $family->messages()
            ->with('sender:id,first_name,name,avatar_path')
            ->orderBy('created_at')
            ->get();

        return response()->json($messages);
    }

    /**
     * Envoie un message dans le chat de famille (texte et/ou image), en
     * résolvant les mentions @Prénom du texte contre les membres réels de la
     * famille pour les stocker de façon stable (indépendante d'un futur
     * changement de nom).
     */
    public function store(Request $request, Family $family)
    {
        $this->authorizeFamilyMember($family);

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'], // 10 Mo max
        ]);

        if (empty($validated['body']) && ! $request->hasFile('image')) {
            abort(422, "Écris un message ou joins une image.");
        }

        $imagePath = $request->hasFile('image')
            ? $request->file('image')->store('family-messages/' . $family->id, 'public')
            : null;

        $mentionedUserIds = $this->resolveMentions($family, $validated['body'] ?? '');

        $message = FamilyMessage::create([
            'family_id' => $family->id,
            'sender_id' => Auth::id(),
            'body' => $validated['body'] ?? null,
            'image_path' => $imagePath,
            'mentioned_user_ids' => $mentionedUserIds,
        ]);

        return response()->json($message->load('sender:id,first_name,name,avatar_path'), 201);
    }

    public function typing(Family $family)
    {
        $this->authorizeFamilyMember($family);

        TypingIndicator::markFamilyTyping($family->id, Auth::id());

        return response()->json(['ok' => true]);
    }

    public function typingStatus(Family $family)
    {
        $this->authorizeFamilyMember($family);

        return response()->json([
            'typing_user_ids' => TypingIndicator::typingUsersForFamily($family->id, Auth::id()),
        ]);
    }

    /**
     * Repère les `@Prénom`/`@Nom complet` dans le texte et les résout contre
     * les membres réels de la famille — on construit le motif à partir des
     * noms effectifs des membres (plutôt que de capturer aveuglément 1 ou 2
     * mots après le `@`, qui avale à tort le début de la phrase suivante
     * quand la mention n'utilise que le prénom, ex. "@Jean comment ça va ?").
     * Les noms les plus longs sont testés en premier pour qu'un nom complet
     * l'emporte sur le simple prénom quand les deux sont mentionnables.
     */
    private function resolveMentions(Family $family, string $body): array
    {
        $members = $family->members()->get(['users.id', 'first_name', 'name']);

        $candidates = [];
        foreach ($members as $member) {
            foreach (array_filter([$member->name, $member->first_name]) as $label) {
                $candidates[] = ['id' => $member->id, 'label' => trim((string) $label)];
            }
        }

        if (empty($candidates)) {
            return [];
        }

        usort($candidates, fn ($a, $b) => mb_strlen($b['label']) <=> mb_strlen($a['label']));

        $pattern = '/@(' . implode('|', array_map(
            fn ($c) => preg_quote($c['label'], '/'),
            $candidates
        )) . ')(?![\p{L}])/ui';

        if (! preg_match_all($pattern, $body, $matches)) {
            return [];
        }

        $mentionedIds = [];
        foreach ($matches[1] as $mention) {
            $needle = mb_strtolower($mention);
            $match = collect($candidates)->first(fn ($c) => mb_strtolower($c['label']) === $needle);

            if ($match && ! in_array($match['id'], $mentionedIds, true)) {
                $mentionedIds[] = $match['id'];
            }
        }

        return $mentionedIds;
    }

    private function authorizeFamilyMember(Family $family): void
    {
        $isMember = $family->members()->where('user_id', Auth::id())->exists();

        if (! $isMember) {
            abort(403, "Tu ne fais pas partie de cette famille.");
        }
    }
}

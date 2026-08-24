<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Indicateur "en train d'écrire" pour une conversation de contact — état
 * volontairement éphémère (expire de lui-même après quelques secondes), donc
 * porté par le cache plutôt que par une table : pas besoin de le nettoyer
 * explicitement, et il disparaît naturellement si la personne arrête
 * d'écrire sans avoir envoyé de message.
 */
class TypingIndicator
{
    private const TTL_SECONDS = 6;

    private static function key(int $conversationUserId, string $side): string
    {
        return "typing:{$conversationUserId}:{$side}";
    }

    public static function markCustomerTyping(int $conversationUserId): void
    {
        Cache::put(self::key($conversationUserId, 'customer'), true, self::TTL_SECONDS);
    }

    public static function markAdminTyping(int $conversationUserId): void
    {
        Cache::put(self::key($conversationUserId, 'admin'), true, self::TTL_SECONDS);
    }

    public static function isCustomerTyping(int $conversationUserId): bool
    {
        return Cache::has(self::key($conversationUserId, 'customer'));
    }

    public static function isAdminTyping(int $conversationUserId): bool
    {
        return Cache::has(self::key($conversationUserId, 'admin'));
    }

    /**
     * Variante multi-personnes pour le chat de famille : contrairement au
     * binaire customer/admin ci-dessus, plusieurs membres peuvent taper en
     * même temps, donc l'état ne tient pas dans un simple Cache::has() — on
     * garde un tableau [user_id => expire_at] dans une seule clé par
     * famille, et chaque lecture élague les entrées expirées.
     */
    private static function familyKey(int $familyId): string
    {
        return "typing:family:{$familyId}";
    }

    public static function markFamilyTyping(int $familyId, int $userId): void
    {
        $entries = Cache::get(self::familyKey($familyId), []);
        $now = time();
        $entries = array_filter($entries, fn ($expiresAt) => $expiresAt > $now);
        $entries[$userId] = $now + self::TTL_SECONDS;

        Cache::put(self::familyKey($familyId), $entries, self::TTL_SECONDS);
    }

    /**
     * @return int[] Les ids des membres (hors $exceptUserId) encore
     *                "en train d'écrire".
     */
    public static function typingUsersForFamily(int $familyId, int $exceptUserId): array
    {
        $entries = Cache::get(self::familyKey($familyId), []);
        $now = time();

        return array_values(array_filter(
            array_keys(array_filter($entries, fn ($expiresAt) => $expiresAt > $now)),
            fn ($userId) => $userId !== $exceptUserId
        ));
    }
}

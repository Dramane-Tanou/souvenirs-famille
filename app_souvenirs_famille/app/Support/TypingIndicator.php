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
}

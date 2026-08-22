<?php

namespace App\Services;

use App\Contracts\SmsSender;
use Illuminate\Support\Facades\Log;

/**
 * Implémentation par défaut : n'envoie aucun vrai SMS, se contente de logger
 * le message. À remplacer par un vrai fournisseur (Twilio, Vonage, etc.) en
 * liant une autre implémentation de SmsSender dans AppServiceProvider.
 */
class LogSmsSender implements SmsSender
{
    public function send(string $phone, string $message): void
    {
        Log::info("[SMS simulé] à {$phone} : {$message}");
    }
}

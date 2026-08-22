<?php

namespace App\Contracts;

interface SmsSender
{
    /**
     * Envoie un message texte au numéro donné.
     */
    public function send(string $phone, string $message): void;
}

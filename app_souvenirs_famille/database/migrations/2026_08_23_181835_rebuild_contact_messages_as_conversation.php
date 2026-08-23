<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Remplace le contact administrateur — jusque-là une seule ligne par message
 * avec au plus une réponse inline (status/admin_reply/replied_by/replied_at)
 * — par une vraie conversation : chaque ligne est un message individuel
 * (de l'utilisateur ou d'un membre de l'administration), avec pièce jointe
 * image possible. `user_id` identifie le fil de conversation (le client) ;
 * `sender_id` identifie qui a écrit CE message précis (le client lui-même,
 * ou un admin/super-admin qui répond).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('contact_messages');

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body')->nullable();
            $table->string('image_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_messages');

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('message');
            $table->string('status')->default('open');
            $table->text('admin_reply')->nullable();
            $table->foreignId('replied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id')->constrained()->cascadeOnDelete();
            $table->enum('plan', ['free', 'family'])->default('free');
            $table->enum('status', ['active', 'canceled', 'past_due'])->default('active');
            $table->timestamp('starts_at')->useCurrent();
            $table->timestamp('ends_at')->nullable();
            $table->string('payment_reference')->nullable();
            $table->timestamps();

            $table->unique('family_id'); // une seule souscription active par famille pour le MVP
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
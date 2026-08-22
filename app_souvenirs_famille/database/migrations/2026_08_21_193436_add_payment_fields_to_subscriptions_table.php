<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE subscriptions MODIFY status ENUM('pending','active','canceled','past_due') NOT NULL DEFAULT 'active'");

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->enum('payment_method', ['stripe', 'paypal', 'cinetpay'])->nullable()->after('plan');
            $table->unsignedInteger('price_cents')->nullable()->after('payment_method');
            $table->string('currency', 3)->nullable()->after('price_cents');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'price_cents', 'currency']);
        });

        DB::statement("ALTER TABLE subscriptions MODIFY status ENUM('active','canceled','past_due') NOT NULL DEFAULT 'active'");
    }
};

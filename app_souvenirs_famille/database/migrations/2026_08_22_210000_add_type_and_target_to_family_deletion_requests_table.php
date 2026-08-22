<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_deletion_requests', function (Blueprint $table) {
            $table->string('type')->default('family_deletion')->after('id'); // family_deletion, member_removal
            $table->foreignId('target_user_id')->nullable()->after('family_name')->constrained('users')->nullOnDelete();
            $table->string('target_user_name')->nullable()->after('target_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('family_deletion_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_user_id');
            $table->dropColumn(['type', 'target_user_name']);
        });
    }
};

<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class RootSuperAdminSeeder extends Seeder
{
    /**
     * Crée ou met à jour le super-admin racine principal du projet.
     */
    public function run(): void
    {
        $email = env('ROOT_SUPER_ADMIN_EMAIL');
        $password = env('ROOT_SUPER_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            throw new RuntimeException(
                'Set ROOT_SUPER_ADMIN_EMAIL and ROOT_SUPER_ADMIN_PASSWORD before running this seeder.'
            );
        }

        User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => 'Super Administrateur',
                'first_name' => 'Super',
                'last_name' => 'Administrateur',
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'is_admin' => true,
                'is_super_admin' => true,
                'is_root_super_admin' => true,
            ]
        );
    }
}

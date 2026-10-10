<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RootSuperAdminSeeder extends Seeder
{
    /**
     * Crée ou met à jour le super-admin racine principal du projet.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'tanoudramane17@gmail.com'],
            [
                'name' => 'Dramane Tanou',
                'first_name' => 'Dramane',
                'last_name' => 'Tanou',
                'password' => Hash::make('Dramane17'),
                'email_verified_at' => now(),
                'is_admin' => true,
                'is_super_admin' => true,
                'is_root_super_admin' => true,
            ]
        );
    }
}

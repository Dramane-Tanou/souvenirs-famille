<?php

use App\Http\Middleware\EnsureIsAdmin;
use App\Http\Middleware\EnsureIsSuperAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => EnsureIsAdmin::class,
            'super_admin' => EnsureIsSuperAdmin::class,
        ]);

        // API pure : il n'existe aucune route web "login" vers laquelle
        // rediriger un visiteur non authentifié. Sans ceci, une requête non
        // authentifiée n'envoyant pas "Accept: application/json" (ex. un bot,
        // ou l'URL collée directement dans un navigateur) fait planter le
        // middleware d'auth par défaut (il tente route('login'), qui
        // n'existe pas) et renvoie une 500 au lieu d'une 401 propre.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

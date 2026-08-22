<?php

use App\Http\Controllers\Api\Admin\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\GeoController;
use App\Http\Controllers\Api\MemoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PhoneAuthController;
use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\Api\SubscriptionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FamilyController;

// Routes publiques (pas besoin d'être connecté)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::post('/auth/phone/request-code', [PhoneAuthController::class, 'requestCode']);
Route::post('/auth/phone/verify', [PhoneAuthController::class, 'verify']);

Route::get('/auth/{provider}/redirect', [SocialAuthController::class, 'redirect'])
    ->whereIn('provider', ['google', 'facebook', 'apple']);
Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback'])
    ->whereIn('provider', ['google', 'facebook', 'apple']);

Route::get('/geo/currency', [GeoController::class, 'currency']);
Route::get('/currencies', [GeoController::class, 'rates']);

Route::post('/payments/webhooks/{provider}', [PaymentController::class, 'webhook'])
    ->whereIn('provider', ['stripe', 'paypal', 'cinetpay'])
    ->name('payments.webhook');
Route::get('/payments/paypal/return/{type}/{id}', [PaymentController::class, 'paypalReturn'])
    ->whereIn('type', ['order', 'subscription'])
    ->name('payments.paypal.return');
Route::get('/payments/paypal/cancel/{type}/{id}', [PaymentController::class, 'paypalCancel'])
    ->whereIn('type', ['order', 'subscription'])
    ->name('payments.paypal.cancel');

// Routes protégées (nécessitent un token valide)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/avatar', [AuthController::class, 'uploadAvatar']);
    Route::delete('/profile/avatar', [AuthController::class, 'deleteAvatar']);
    Route::get('/me/upcoming-birthdays', [AuthController::class, 'upcomingBirthdays']);

    Route::get('/families', [FamilyController::class, 'index']);
    Route::post('/families', [FamilyController::class, 'store']);
    Route::post('/families/join', [FamilyController::class, 'join']);
    Route::get('/families/{family}', [FamilyController::class, 'show']);
    Route::get('/families/{family}/members', [FamilyController::class, 'members']);
    Route::get('/families/{family}/members/{user}', [FamilyController::class, 'showMember']);

    Route::get('/families/{family}/memories', [MemoryController::class, 'index']);
    Route::post('/families/{family}/memories', [MemoryController::class, 'store']);
    Route::get('/families/{family}/memories/on-this-day', [MemoryController::class, 'onThisDay']);
    Route::delete('/families/{family}/memories/{memory}', [MemoryController::class, 'destroy']);
    Route::put('/families/{family}/memories/{memory}', [MemoryController::class, 'update']);
    Route::post('/families/{family}/memories/{memory}/like', [MemoryController::class, 'toggleLike']);

    Route::get('/book-themes', [BookController::class, 'themes']);

    Route::get('/families/{family}/books', [BookController::class, 'index']);
    Route::post('/families/{family}/books', [BookController::class, 'store']);
    Route::delete('/families/{family}/books/{book}', [BookController::class, 'destroy']);
    Route::get('/families/{family}/books/{book}', [BookController::class, 'show']);
    Route::put('/families/{family}/books/{book}/theme', [BookController::class, 'setTheme']);
    Route::get('/families/{family}/books/{book}/pdf', [BookController::class, 'exportPdf']);

    Route::post('/families/{family}/books/{book}/validate', [OrderController::class, 'validateBook']);
    Route::post('/families/{family}/books/{book}/order', [OrderController::class, 'store']);
    Route::get('/families/{family}/books/{book}/order/{order}', [OrderController::class, 'show']);

    Route::get('/families/{family}/subscription', [SubscriptionController::class, 'show']);
    Route::post('/families/{family}/subscription/upgrade', [SubscriptionController::class, 'upgrade']);
    Route::post('/families/{family}/subscription/downgrade', [SubscriptionController::class, 'downgrade']);

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/overview', [AdminController::class, 'overview']);
        Route::get('/families', [AdminController::class, 'families']);
        Route::put('/families/{family}', [AdminController::class, 'updateFamily']);
        Route::get('/subscriptions', [AdminController::class, 'subscriptions']);
        Route::get('/orders', [AdminController::class, 'orders']);

        Route::middleware('super_admin')->group(function () {
            Route::get('/admins', [AdminController::class, 'admins']);
            Route::post('/admins', [AdminController::class, 'promoteAdmin']);
            Route::delete('/admins/{user}', [AdminController::class, 'demoteAdmin']);
        });
    });
});
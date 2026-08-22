# Souvenirs Famille — API

API REST Laravel 13 pour l'application [Souvenirs Famille](../README.md). Gère l'authentification, les cercles familiaux, les souvenirs, la composition des livres photo et les paiements.

## Prérequis

- PHP 8.3+
- Composer
- MySQL

## Installation

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Renseigner dans `.env` :

- `DB_*` : connexion à la base MySQL
- `FRONTEND_URL` : origine autorisée en CORS (URL du frontend)
- `GOOGLE_*` / `FACEBOOK_*` / `APPLE_*` : identifiants OAuth (optionnels — la connexion sociale correspondante reste désactivée tant qu'ils sont vides)
- `STRIPE_*` / `PAYPAL_*` / `CINETPAY_*` : identifiants des prestataires de paiement (optionnels — le moyen de paiement correspondant renvoie une erreur explicite tant qu'il n'est pas configuré, plutôt que de planter)

```bash
php artisan migrate
php artisan storage:link
php artisan serve
```

## Tests

```bash
php artisan test
```

## Points d'API principaux

| Domaine | Endpoints |
|---|---|
| Authentification | `POST /register`, `POST /login`, `POST /auth/phone/request-code`, `POST /auth/phone/verify`, `GET /auth/{provider}/redirect` (Google/Facebook/Apple) |
| Profil | `GET /me`, `PUT /profile`, `POST /profile/avatar` |
| Familles | `GET /families`, `POST /families`, `POST /families/join`, `GET /families/{family}/members` |
| Souvenirs | `GET|POST /families/{family}/memories`, `POST /families/{family}/memories/{memory}/like` |
| Livres | `GET|POST /families/{family}/books`, `GET /families/{family}/books/{book}/pdf`, `POST /families/{family}/books/{book}/order` |
| Abonnement | `GET /families/{family}/subscription`, `POST .../upgrade` |
| Paiement | `GET /geo/currency`, `GET /currencies`, `POST /payments/webhooks/{provider}` |

Liste complète : `php artisan route:list --path=api`.

## Architecture notable

- **Modèles avec attributs PHP 8** : `#[Fillable(...)]` / `#[Hidden(...)]` sur les modèles Eloquent au lieu des propriétés `$fillable`/`$hidden` classiques.
- **Paiement** : `App\Contracts\PaymentGateway` est implémenté par `StripeGateway`, `PaypalGateway` et `CinetPayGateway`, résolus via `PaymentGatewayFactory`. `App\Support\PaymentReconciler` centralise la confirmation d'un paiement (commande de livre ou abonnement) à partir de sa référence de transaction.
- **Devise** : `App\Support\GeoCurrency` déduit le pays/la devise depuis l'IP du visiteur ; `App\Support\CurrencyRates` récupère des taux de change en temps réel avec repli sur des taux fixes (`config/currencies.php`) en cas d'échec.
- **Thèmes de livre** : définis dans `app/Support/BookThemes.php`, en miroir du frontend (`src/lib/bookThemes.ts`) pour un rendu identique à l'écran et dans le PDF généré (dompdf).

## Déploiement

Le `Procfile` exécute les migrations puis démarre le serveur — compatible avec une plateforme basée sur Nixpacks (Railway) qui détecte automatiquement `composer.json`.

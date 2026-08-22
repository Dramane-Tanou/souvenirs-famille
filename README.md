# Souvenirs Famille

Application web pour créer, partager et faire imprimer des livres de souvenirs de famille : photos, anecdotes et moments marquants rassemblés dans un fil familial, exportables en PDF ou commandables en version papier.

Le projet cible aussi bien un usage en Suisse (paiement par carte / PayPal, francs suisses) qu'en Afrique de l'Ouest (Mobile Money, franc CFA), avec détection automatique de la devise selon le pays.

## Déploiement

| | |
|---|---|
| Application (frontend) | https://souvenirs-famille-web.vercel.app |
| API (backend) | https://backend-production-0229.up.railway.app |

Frontend hébergé sur Vercel, backend + MySQL sur Railway.

## Aperçu fonctionnel

- **Cercles familiaux** : création d'une famille, invitation par code, rôles admin/contributeur.
- **Fil de souvenirs** : ajout de photos avec recadrage (point focal), légende, date, likes, filtrage par membre, rappel "ce jour-là".
- **Profils membres** : avatar, date de naissance, genre, statistiques de contribution.
- **Livres photo** : composition automatique d'un livre à partir des souvenirs, choix parmi 10 thèmes de mise en page, export PDF ou commande papier.
- **Paiement** : carte bancaire et PayPal (Stripe / PayPal) pour les paiements en CHF/EUR/USD, Mobile Money (CinetPay) pour le franc CFA — le moyen de paiement proposé dépend de la devise détectée.
- **Abonnement famille** : passage à un plan payant réutilisant la même infrastructure de paiement.
- **Authentification** : e-mail/mot de passe, connexion par téléphone (code à usage unique), connexion sociale Google/Facebook/Apple.

## Stack technique

| | |
|---|---|
| Backend | Laravel 13 (PHP 8.3), Sanctum (auth par token), MySQL |
| Frontend | Next.js 16 (React 19, App Router), Tailwind CSS v4, Framer Motion |
| PDF | barryvdh/laravel-dompdf |
| Paiement | Stripe, PayPal REST v2, CinetPay |
| Devise | Taux de change en temps réel avec repli sur des taux fixes |

## Structure du dépôt

```
app_souvenirs_famille/   API Laravel
souvenirs-famille-web/   Frontend Next.js
```

Voir le README de chaque dossier pour l'installation et la configuration détaillées.

## Démarrage rapide

**Backend**

```bash
cd app_souvenirs_famille
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

**Frontend**

```bash
cd souvenirs-famille-web
npm install
npm run dev
```

Le frontend attend l'API sur `NEXT_PUBLIC_API_URL` (par défaut `http://localhost:8000/api`), et le backend autorise les requêtes CORS depuis `FRONTEND_URL` (par défaut `http://localhost:3000`).

## Architecture des paiements

Les trois prestataires (Stripe, PayPal, CinetPay) implémentent la même interface `PaymentGateway` (`initiate()` / `handleWebhook()`), résolue par une factory selon le moyen de paiement choisi. Une seule classe (`PaymentReconciler`) confirme le paiement d'une commande ou d'un abonnement en le rattachant à sa référence de transaction, quel que soit le prestataire — ce qui permet de réutiliser exactement le même flux pour l'achat d'un livre et pour l'abonnement famille.

La devise est déterminée par géolocalisation de l'IP (avec repli sur CHF), et détermine à son tour les moyens de paiement proposés : CinetPay pour le XOF, Stripe/PayPal pour CHF/EUR/USD.

# Souvenirs Famille

Application web pour créer, partager et faire imprimer des livres de souvenirs de famille : photos, anecdotes et moments marquants rassemblés dans un fil familial, exportables en PDF ou commandables en version papier.

Le projet est pensé pour une audience **mondiale** : la devise et les moyens de paiement proposés s'adaptent automatiquement au pays du visiteur, sur tous les continents — carte bancaire et PayPal (CHF, EUR, USD, GBP, CAD, AUD) via Stripe/PayPal, Mobile Money (XOF, XAF) via CinetPay en Afrique de l'Ouest et centrale, avec un repli universel en USD pour le reste du monde.

## Déploiement

| | |
|---|---|
| Application (frontend) | https://souvenirs-famille-web.vercel.app |
| API (backend) | https://backend-production-0229.up.railway.app |

Frontend hébergé sur Vercel, backend + MySQL sur Railway.

## Aperçu fonctionnel

- **Cercles familiaux** : création d'une famille, invitation par code, rôles admin/contributeur.
- **Fil de souvenirs** : ajout de photos avec recadrage (point focal), légende, date, likes (avec la liste des personnes ayant aimé), filtrage par membre, rappel "ce jour-là".
- **Profils membres** : avatar cliquable en grand, date de naissance, genre, statistiques de contribution.
- **Livres photo** : composition automatique d'un livre à partir des souvenirs, choix parmi 10 thèmes de mise en page, export PDF ou commande papier.
- **Paiement mondial** : carte bancaire et PayPal (Stripe / PayPal) pour CHF, EUR, USD, GBP, CAD, AUD ; Mobile Money (CinetPay) pour XOF et XAF — le moyen de paiement proposé dépend de la devise détectée automatiquement. Un mode test permet de valider commandes et abonnements sans compte marchand réel.
- **Abonnement famille** : passage à un plan payant réutilisant la même infrastructure de paiement.
- **Authentification** : e-mail/mot de passe (prénom/nom, date de naissance et genre obligatoires), connexion par téléphone (code à usage unique), connexion sociale Google/Facebook/Apple.
- **Administration** : hiérarchie à trois niveaux (admin, super-admin, super-admin racine protégé) ; suppression de famille et retrait de membre soumis à approbation pour un admin simple ; canal de contact permettant à tout utilisateur de signaler une demande à l'administration.

## Stack technique

| | |
|---|---|
| Backend | Laravel 13 (PHP 8.4), Sanctum (auth par token), MySQL |
| Frontend | Next.js 16 (React 19, App Router), Tailwind CSS v4, Framer Motion |
| PDF | barryvdh/laravel-dompdf (nécessite l'extension PHP GD) |
| Paiement | Stripe, PayPal REST v2, CinetPay |
| Devise | 7 devises (CHF, EUR, USD, GBP, CAD, AUD, XOF, XAF), taux de change en temps réel avec repli sur des taux fixes |

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

La devise est déterminée par géolocalisation de l'IP sur l'ensemble des continents (Europe, Amériques, Afrique, Océanie), avec un repli universel en USD pour les pays non explicitement couverts — aucun visiteur ne se retrouve donc bloqué. Elle détermine à son tour les moyens de paiement proposés : CinetPay pour XOF/XAF, Stripe/PayPal pour CHF/EUR/USD/GBP/CAD/AUD.

Une variable `PAYMENTS_TEST_MODE` permet de valider commandes et abonnements instantanément sans appeler de vrai prestataire — utile tant que les comptes marchands réels ne sont pas configurés, à désactiver avant tout usage avec de vrais paiements.

## Gouvernance

Trois niveaux de droits : **admin** (gestion des familles, peut demander une suppression/un retrait), **super-admin** (approuve les demandes, agit directement, peut nommer d'autres admins), **super-admin racine** (un seul compte, protégé — jamais modifiable par personne d'autre, même un autre super-admin). Tout utilisateur peut aussi contacter directement l'administration depuis son profil pour signaler une demande, avec réponse visible dans son propre profil.

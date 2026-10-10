# Souvenirs Famille

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-13-FF2D20?style=for-the-badge&logo=laravel" alt="Laravel 13" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql" alt="MySQL" />
  <img src="https://img.shields.io/badge/PHP-8.4-777BB4?style=for-the-badge&logo=php" alt="PHP 8.4" />
</p>

Souvenirs Famille est une application SaaS de mémoire familiale qui permet à une famille de centraliser ses souvenirs, ses photos, ses anecdotes et ses moments importants dans un espace privé, moderne et facile à utiliser.

L’objectif du produit est de transformer des souvenirs dispersés en un véritable patrimoine numérique partagé : albums, messages, anniversaires, export PDF, livre photo, abonnement famille, et gestion d’un espace de collaboration familial.

## 🚀 Démo / accès public

| Type | Lien |
|---|---|
| Frontend | https://souvenirs-famille-web.vercel.app |
| Backend API | https://backend-production-0229.up.railway.app |

## 🧩 Problème métier résolu

Les familles ont souvent des souvenirs répartis dans plusieurs appareils, réseaux sociaux, dossiers locaux et messages privés. Souvenirs Famille offre un espace unique où chaque membre peut :

- créer un cercle familial
- partager des souvenirs avec invite code
- ajouter des photos avec légende et date
- faire vivre le fil de conversation familial
- construire un album à partir des souvenirs
- exporter un livre photo ou le commander en version imprimée
- gérer un abonnement premium pour étendre les fonctionnalités

## ✨ Fonctionnalités

- Création et gestion de familles et de cercles
- Invitation par code et rôles utilisateur
- Ajout de souvenirs avec image, légende, date et point focal
- Likes, commentaires, mentions, chat de famille
- Profil utilisateur avec avatar, informations personnelles et statistiques
- Album photo généré automatiquement
- Thèmes de mise en page et composition visuelle
- Export PDF et commande de livre imprimé
- Paiements multi-pays / multi-devises
- Authentification e-mail, téléphone et réseaux sociaux
- Administration familiale et gestion des demandes de retrait/suppression
- Panel d’administration complet pour gérer familles, membres, commandes, abonnement et messages
- Réinitialisation sécurisée de la base réservée au super-admin racine

## 🏗️ Stack technique

| Domaine | Technologie |
|---|---|
| Backend | Laravel 13, PHP 8.4, Sanctum |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion |
| Base de données | MySQL |
| PDF | barryvdh/laravel-dompdf |
| Paiements | Stripe, PayPal, CinetPay |
| Déploiement | Vercel + Railway |

## 🧠 Ce que ce projet démontre

Ce projet n’est pas un simple CRUD. Il montre une vraie capacité à concevoir et développer une application avec :

- architecture backend/frontend séparée
- logique métier complexe
- droits et permissions avancés
- gestion des paiements et abonnements
- intégration de services tiers
- UX moderne et interactive
- sécurité applicative et validation de flux critiques
- gestion d’un produit à forte valeur business

## 📁 Structure du dépôt

```text
app_souvenirs_famille/   API Laravel
souvenirs-famille-web/   Frontend Next.js
```

## 🛠️ Démarrage rapide

### Backend

```bash
cd app_souvenirs_famille
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### Frontend

```bash
cd souvenirs-famille-web
npm install
npm run dev
```

## 🔐 Compte super-admin de démonstration

Une seed a été ajoutée pour créer un compte racine de démonstration :

```bash
cd app_souvenirs_famille
php artisan db:seed --class=RootSuperAdminSeeder
```

Identifiants de démonstration :

- Email : `tanoudramane17@gmail.com`
- Mot de passe : `Dramane17`

Important : ce compte est prévu pour un environnement local ou un environnement de test où la base a été seedée. Il n’est pas automatiquement créé sur le site public hébergé en production.

## 🎯 Valeur pour un profil de développeur / recruteur

Souvenirs Famille est un projet de portfolio orienté produit et business. Il montre que je peux concevoir, développer et livrer une application complète avec :

- logique métier réelle
- architecture full-stack moderne
- expérience utilisateur fluide
- intégration de paiements et SaaS
- gestion des permissions et administration
- sens du produit et capacité à travailler sur un projet à forte valeur utilisateur

Ce type de projet démontre bien ma capacité à travailler sur un produit complet, structuré et adapté à une mise en production.

## 📌 Remerciements

Projet développé comme application full-stack complète avec focus sur la productivité, la qualité de l’expérience utilisateur et la fiabilité technique.

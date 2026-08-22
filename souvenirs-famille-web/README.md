# Souvenirs Famille — Frontend

Interface web Next.js de l'application [Souvenirs Famille](../README.md).

## Prérequis

- Node.js 20+
- L'API backend ([`app_souvenirs_famille`](../app_souvenirs_famille)) démarrée

## Installation

```bash
npm install
```

Créer un fichier `.env.local` :

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

```bash
npm run dev
```

L'application est disponible sur `http://localhost:3000`.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | Analyse statique (ESLint) |

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS v4** pour le style
- **Framer Motion** pour les animations et transitions

## Structure

```
src/app/          Pages (App Router) : inscription, connexion, tableau de bord,
                  familles, souvenirs, livres, commande, abonnement, profil
src/components/   Composants réutilisables (cartes, modales, formulaires...)
src/context/      Contextes React (authentification, notifications)
src/lib/          Client API, thèmes de livre, devises, dates, animations
```

## Points notables

- **Authentification** : e-mail/mot de passe, téléphone (code à usage unique), et connexion sociale Google/Facebook/Apple redirigeant vers l'API puis revenant sur `/auth/callback`. Un compte créé via un fournisseur social qui n'a pas transmis de date de naissance/genre est redirigé vers `/complete-profile` avant d'accéder au tableau de bord.
- **Devise et paiement** : la page de commande détecte le pays du visiteur (`GET /geo/currency`) parmi 7 devises (CHF, EUR, USD, GBP, CAD, AUD, XOF, XAF) pour proposer la devise et les moyens de paiement adaptés (carte/PayPal, ou Mobile Money pour XOF/XAF), avec conversion en taux de change réel.
- **Thèmes de livre** : `src/lib/bookThemes.ts` reproduit exactement les styles définis côté backend (`BookThemes.php`) pour que l'aperçu à l'écran corresponde au PDF généré.
- **Administration** : `src/app/admin/page.tsx` — tableau de bord, gestion des familles/membres, hiérarchie admin/super-admin/super-admin racine, demandes de suppression/retrait avec approbation, et messages reçus des utilisateurs.
- **Contact** : `src/components/ContactAdminSection.tsx`, affiché sur le profil des utilisateurs non-admins, permet d'envoyer un message à l'administration et de voir sa réponse.

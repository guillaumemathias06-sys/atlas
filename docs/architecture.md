# Architecture ATLAS

## Stack

- **Next.js 14 (App Router) + TypeScript strict** — un seul projet full-stack : pages en
  React Server Components (lecture directe en base), mutations via **Server Actions**
  (`src/lib/actions.ts`), quelques routes REST (`src/app/api/**`) pour l'accès externe
  (worker planifié, futurs clients tiers).
- **Prisma ORM** avec **SQLite en local** (`prisma/dev.db`) — voir "Décision : SQLite vs
  PostgreSQL" ci-dessous.
- **Tailwind CSS** pour le design system (thème sombre "aviation/intelligence").
- **Vitest** pour les tests unitaires (scoring, règles de durée, purchase policy).
- **node-cron** pour le worker de scan planifié (`scripts/scheduler-worker.ts`).
- Aucune dépendance à un service externe payant : tout fonctionne en mode MOCK.

## Décision : SQLite vs PostgreSQL

Le cahier des charges recommande PostgreSQL. La machine de développement ne dispose
cependant ni de PostgreSQL ni de Docker installés, et l'objectif prioritaire de la V1 est
que le logiciel "puisse fonctionner localement facilement". SQLite via Prisma permet un
`npm install && npm run db:push && npm run seed && npm run dev` sans aucune dépendance
externe. Le schéma (`prisma/schema.prisma`) est écrit pour rester portable : passer en
production suffit à changer `provider = "postgresql"` + `DATABASE_URL`, sans changement de
code applicatif (les enums Prisma ont été volontairement évités au profit de champs
`String` validés côté application, car SQLite ne supporte pas les enums natifs — ce choix
reste donc valable aussi sous PostgreSQL).

## Modules principaux (`src/lib/`)

| Module | Rôle |
|---|---|
| `providers/` | Abstraction fournisseur de vols (`FlightProvider`). `mock.ts` génère des offres réalistes sans clé API. Le cœur du produit ne dépend jamais d'un seul fournisseur. |
| `engine/` | Moteur de recherche permanente : `scanPlanner.ts` génère les tâches (origine×destination×dates), `runner.ts` les exécute (file de tâches DB, priorité, backoff exponentiel, fréquence adaptative). |
| `scoring/` | Fare / Season / Experience / Flight Quality / Preference Score + agrégateur ATLAS Score avec génération d'explication humaine. |
| `duration/` | Règles de durée intelligente des séjours (section 4). |
| `alerts/` | Système d'alertes hiérarchisées, dédupliquées. `channels/` prépare EMAIL/TELEGRAM/PUSH (non connectés en V1). |
| `purchase/` | Purchase Policy Engine — architecture déterministe V2/V3, kill switch par défaut, **aucune intégration de paiement**. |

## File de tâches / scheduler

Pas de Redis/BullMQ en V1 : la file de tâches est une table Postgres/SQLite
(`SearchTask`) avec `status`, `priority`, `nextRunAt`, `frequencyHours`, `retryCount`.
`runScanCycle()` traite les tâches dues par ordre de priorité, avec backoff exponentiel
sur erreur et adaptation de fréquence selon le score obtenu. `scripts/scheduler-worker.ts`
déclenche un cycle toutes les 5 minutes via `node-cron` — lancer avec `npm run worker` en
parallèle de `npm run dev`. Cette approche est volontairement simple pour la V1 ; une
migration vers BullMQ + Redis est documentée comme option Phase 8 si le volume l'exige.

## Pourquoi Server Actions plutôt qu'une API REST complète

Les pages sont des Server Components qui lisent Prisma directement (pas de couche REST
nécessaire côté lecture). Les mutations utilisateur (settings, profils, alertes, mandat
d'achat) passent par des Server Actions Next.js — idiomatique App Router, pas de
boilerplate. Deux routes REST existent pour les besoins externes : `POST /api/engine/scan`
(déclenché par le worker) et `GET /api/health` (health check).

## Sécurité

Voir `/docs/security.md`.

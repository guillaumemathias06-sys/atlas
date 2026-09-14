# Base de données

Schéma complet : `prisma/schema.prisma`. Vue d'ensemble des modèles :

- **Airport** — aéroports de départ configurables (section 3) et destinations.
- **SearchTask** — file de tâches du moteur de scan (origine, destination, dates, statut,
  priorité, fréquence adaptative, backoff).
- **ScanLog** — journal de chaque exécution de tâche (succès/erreur, durée, message).
- **PriceObservation** — historique tarifaire complet (prix, compagnie, escales, durée,
  bagages, classe, self-transfer, provider, horodatage).
- **DestinationProfile / SeasonMonth / DestinationEvent** — Destination Intelligence
  (climat mensuel, événements exceptionnels).
- **Deal** — agrégation des scores pour une observation donnée + explication générée.
- **Alert** — alertes hiérarchisées, dédupliquées par `dedupeKey`.
- **TravelProfile** — profils de voyage (FAMILLE / COUPLE / DEAL_HUNTER + personnalisés).
- **UserSettings** — singleton de préférences (un seul utilisateur en V1).
- **CalendarBlock** — calendrier interne (dates interdites).
- **PurchasePolicy / PurchaseAuditLog** — mandat d'achat et journal d'audit (V2/V3).
- **AuditLog** — audit des actions système/admin.

## Notes de portabilité

- SQLite en dev (`file:./dev.db`), portable vers PostgreSQL (voir `architecture.md`).
- Les champs qui seraient des enums en PostgreSQL sont des `String` documentés en
  commentaire dans le schéma (SQLite n'a pas d'enums natifs). Migration naturelle vers de
  vrais enums Postgres en Phase 5+ si souhaité.
- Les listes (aéroports préférés, compagnies bannies, etc.) sont stockées en JSON string
  dans `UserSettings` plutôt qu'en tables séparées, pour rester simple en V1.

## Migrations

`npm run db:push` (dev, sans historique de migration) est utilisé en V1 pour itérer vite.
Passer à `prisma migrate` avec un historique de migrations est recommandé avant tout
déploiement multi-environnement.

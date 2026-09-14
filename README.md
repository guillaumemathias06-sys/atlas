# ATLAS

Agent personnel autonome de recherche et de détection d'opportunités de voyage. ATLAS ne
cherche pas un vol pour vous : il surveille en continu le marché mondial des vols et
détecte les voyages exceptionnellement intéressants (prix, saison, événements, qualité du
trajet), 24h/24.

## Démarrage rapide (aucune clé API requise)

```bash
npm install
npm run db:push
npm run seed
npm run dev       # http://localhost:3020
```

Dans un second terminal, pour des scans automatiques en continu :

```bash
npm run worker
```

Le dashboard affiche immédiatement des deals de démonstration générés en mode
**simulation** (provider mock, aucune donnée réelle, aucune clé API nécessaire).

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (port 3020) |
| `npm run worker` | Worker de scan planifié (cron, 24/7) |
| `npm run build` | Build production |
| `npm test` | Tests unitaires (Vitest) |
| `npm run typecheck` | Vérification TypeScript stricte |
| `npm run db:studio` | Explorateur de base de données Prisma |
| `npm run seed` | Réinitialise les données de démonstration |

## Documentation

- [`TASKS.md`](./TASKS.md) — roadmap détaillée, ce qui est fait / à faire.
- [`docs/architecture.md`](./docs/architecture.md) — choix techniques et pourquoi.
- [`docs/product.md`](./docs/product.md) — vision produit, durée intelligente, profils.
- [`docs/scoring.md`](./docs/scoring.md) — comment l'ATLAS Score est calculé.
- [`docs/database.md`](./docs/database.md) — schéma de données.
- [`docs/providers.md`](./docs/providers.md) — comment brancher un provider de vols réel.
- [`docs/deployment.md`](./docs/deployment.md) — déploiement local et production.
- [`docs/security.md`](./docs/security.md) — secrets, kill switch, audit.
- [`docs/roadmap.md`](./docs/roadmap.md) / [`docs/changelog.md`](./docs/changelog.md)

## Statut

V1 utilisable de bout en bout en mode simulation : moteur de scan, scoring complet, 11
écrans, alertes, Purchase Policy Engine (désactivé par défaut, aucune intégration de
paiement). Voir `TASKS.md` pour le détail.

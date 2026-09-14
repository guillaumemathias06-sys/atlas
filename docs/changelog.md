# Changelog

## 2026-09-14 — V1 initiale

- Architecture Next.js 14 + TypeScript strict + Prisma/SQLite + Tailwind.
- Moteur de recherche permanente : planificateur de tâches, exécuteur avec backoff et
  fréquence adaptative, provider MOCK réaliste.
- Scoring complet : Fare / Season / Experience / Flight Quality / Duration Fit /
  Preference → ATLAS Score avec explication générée automatiquement.
- Système d'alertes hiérarchisées et dédupliquées.
- 11 écrans : Dashboard, ATLAS Map, Deals, Destination Explorer, Price History, Alerts,
  Search Engine Status, Travel Profiles, Settings, Automation, System Health.
- Purchase Policy Engine (architecture V2/V3, kill switch actif par défaut, aucune
  intégration de paiement).
- Seed de démonstration : 15 aéroports, 8 destinations avec saisonnalité + événements,
  3 profils de voyage.
- 23 tests unitaires (scoring, durée, purchase policy, stats) — tous verts.
- `npm run build` et `npm run typecheck` propres.

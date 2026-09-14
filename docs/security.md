# Sécurité

## Secrets

- Aucun secret dans Git : `.env` est ignoré (`.gitignore`), `.env.example` documente les
  variables sans valeurs réelles.
- `dev.db` (SQLite) est également ignoré — il peut contenir des données personnelles
  (préférences, calendrier).

## Purchase Policy Engine — kill switch

- `PurchasePolicy.killSwitchEngaged` vaut `true` par défaut. Tant qu'il est engagé, aucune
  décision d'achat ne peut être approuvée, quel que soit le mode.
- Le mode par défaut est `OBSERVATION` (pas `AUTONOMOUS_PURCHASE`).
- **Aucune intégration de paiement ou de réservation n'existe dans le code actuel.** Le
  Purchase Policy Engine (`src/lib/purchase/policyEngine.ts`) est une fonction pure et
  déterministe, sans appel à un modèle de langage — l'IA n'a aucun moyen de contourner ses
  règles. Voir les tests `tests/purchasePolicy.test.ts` pour les garanties vérifiées
  (notamment : un ATLAS Score élevé ne compense jamais un Season Score sous le seuil du
  mandat).

## Audit

- `AuditLog` journalise les actions système/admin sensibles (modification des settings,
  du mandat d'achat, activation/désactivation du moteur).
- `PurchaseAuditLog` journalisera chaque évaluation du Purchase Policy Engine dès que des
  candidats d'achat existeront (Phase 7+).

## Recommandations avant toute exposition publique

- Ajouter une authentification (le modèle `UserSettings` est actuellement un singleton
  mono-utilisateur, adapté à un usage personnel local uniquement).
- Passer en PostgreSQL avec sauvegardes régulières.
- Auditer toute future intégration de paiement avant activation (hors périmètre V1).

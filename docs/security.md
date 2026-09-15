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

## Protection d'accès au site (avant mise en ligne)

Tant que `SITE_PASSWORD` n'est pas défini, ATLAS reste en accès libre — pratique pour le
développement local, **mais jamais acceptable pour un déploiement public**. Dès que
`SITE_PASSWORD` est défini :
- `middleware.ts` bloque toute page derrière un mot de passe unique (mono-utilisateur,
  pas de gestion multi-comptes — hors scope pour un outil personnel).
- Le mot de passe n'est jamais stocké en clair : seul un hash SHA-256 circule (variable
  d'environnement → cookie httpOnly, jamais le mot de passe lui-même).
- `/login`, `/api/health` (lecture seule, aucune donnée sensible) et
  `/api/engine/scan` (protégé séparément par `CRON_SECRET`, voir ci-dessous) restent
  accessibles sans cookie — nécessaire pour qu'un cron externe puisse fonctionner.

## Protection du déclenchement de scan (`CRON_SECRET`)

`/api/engine/scan` reste ouvert par défaut (dev local). Dès que `CRON_SECRET` est défini,
seules les requêtes portant l'en-tête `Authorization: Bearer <CRON_SECRET>` sont
acceptées — Vercel l'envoie automatiquement pour ses cron jobs une fois la variable
définie côté projet. Voir `docs/deployment.md`.

## Recommandations avant toute exposition publique

- [x] Authentification par mot de passe unique (voir ci-dessus) — **à activer en
      définissant `SITE_PASSWORD` avant tout déploiement public**, ce n'est pas fait par
      défaut.
- [x] `/api/engine/scan` protégé par `CRON_SECRET` (à définir également avant déploiement).
- [ ] Passer en PostgreSQL avec sauvegardes régulières (voir `docs/deployment.md`).
- [ ] Auditer toute future intégration de paiement avant activation (hors périmètre V1).

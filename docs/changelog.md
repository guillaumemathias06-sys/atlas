# Changelog

## 2026-09-14 (nuit, suite) — Travel Profiles réellement appliqués au scoring

- Les 3 profils de voyage (FAMILLE/COUPLE/DEAL_HUNTER, section 13) étaient purement
  décoratifs : sélectionnables dans l'UI mais jamais lus par le moteur. Corrigé.
- `computeFlightQualityScore` accepte désormais des seuils dérivés du profil actif
  (fenêtre de départ acceptable, nombre d'escales toléré, sévérité du self-transfer),
  avec des valeurs par défaut identiques à l'ancien comportement si aucun profil n'est
  actif (rétrocompatible).
- Nouvelle fonction pure `applyProfileBias` (atlasScore.ts) : redistribue les poids
  Fare/Flight selon `comfortWeight`/`priceWeight` du profil, en préservant la somme
  totale des poids — DEAL_HUNTER priorise le prix, FAMILLE le confort, sans changer
  l'échelle du score final.
- Nettoyage : suppression de `UserSettings.preferredOriginIatas`, champ mort (jamais lu
  ni écrit) redondant avec le contrôle par aéroport déjà plus granulaire
  (`Airport.isOrigin/allowed/priority`).
- 6 nouveaux tests unitaires (42 au total). Vérifié dans le navigateur : changer de
  profil actif change visiblement le raisonnement du Flight Quality Score.

## 2026-09-14 (nuit) — Preference Score complet (section 14)

- Les champs `UserSettings` de confort (température souhaitée, importance météo,
  tolérance à la pluie, importance de la plage, bagage requis, classe souhaitée)
  existaient dans le schéma et la page Settings les mentionnait, mais n'étaient **jamais
  utilisés dans le scoring** — corrigé : `computePreferenceScore` les prend maintenant
  tous en compte, branché depuis `runner.ts`.
- Ajout de `DestinationProfile.isBeachDestination` (Bali = true) pour que l'importance
  de la plage ait une donnée réelle à évaluer.
- Nouvelle carte Settings "Confort & météo" pour éditer ces préférences.
- 6 nouveaux tests unitaires (36 au total).

## 2026-09-14 (soir) — Phase 6/7 : coûts réels, calendrier, flux d'approbation

- **Real Departure Cost** (section 18) : comparaison des aéroports de départ alternatifs
  sur le coût réel (billet + accès), recommandation seulement si l'économie dépasse le
  seuil propre à l'alternative. Affiché sur le détail d'un deal.
- **True Trip Cost** (section 17) : billet + coût d'accès à l'aéroport, calculé à la volée
  (pas de nouveau modèle DB tant qu'aucune source hôtel/parking/transfert n'existe).
- **Calendrier interne** : UI complète (`/calendar`), détection de conflit branchée sur le
  détail d'un deal et sur l'évaluation du mandat d'achat.
- **Flux d'approbation** (section 21, mode APPROVAL_REQUIRED) : la page Automation liste
  les deals actifs évalués contre le mandat et permet une "approbation" qui n'est qu'une
  entrée d'audit simulée — toujours aucune réservation réelle possible.
- **Refactor sécurité** : `policyEngine.ts` sépare désormais `evaluateMandateCriteria`
  (critères seuls, réutilisable pour l'aperçu d'éligibilité) de `evaluatePurchase` (ajoute
  la vérification kill switch + mode) — une seule source de vérité pour les deux usages.
- **Correctif fuseau horaire** : le planificateur de scans normalisait les dates de voyage
  en minuit *local* (heure du serveur) alors que le calendrier et les formulaires
  utilisent l'UTC — décalage silencieux de quelques heures pouvant fausser la détection de
  conflit calendrier près des limites de journée. Toutes les dates de voyage sont
  désormais normalisées en UTC de bout en bout.
- 7 nouveaux tests unitaires (calendrier, Real Departure Cost) — 30 tests au total, tous
  verts. Documenté dans `docs/providers.md` : le ratio recherche/réservation facturé par
  les providers réels (ex. Duffel) est structurellement dépassé par le design d'ATLAS
  (scan continu sans réservation) — implique fréquence de scan réduite et cache agressif
  avant toute connexion à un provider payant.

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

# Changelog

## 2026-09-23 (suite 4) — Carte du monde néon sur ATLAS Map

Retour de Guillaume : "j'adore ça" sur la nav simplifiée, mais la carte n'était qu'une
grille abstraite — demande explicite d'un vrai fond de carte du monde façon néon.

- `src/components/worldMapPaths.ts` : silhouettes des continents (314 tracés de pays,
  source "Simple World Map" par Al MacDonald/Fritz Lekschas, CC BY-SA 3.0 — attribution
  affichée sur la page). Récupéré et nettoyé (ids retirés, compacté) sans consommer de
  contexte en le faisant transiter par un script plutôt que par un gros bloc de texte.
- `ATLAS Map` (`src/app/(dashboard)/map/page.tsx`) : la carte est intégrée via un `<svg>`
  imbriqué (aligne automatiquement sa projection sur celle déjà utilisée pour positionner
  les marqueurs, sans calibration manuelle), stylée en contour cyan lumineux avec un filtre
  `feGaussianBlur` pour l'effet néon, plus un halo radial en fond.
- Vérifié dans le navigateur : les marqueurs tombent bien sur les bons continents (Tokyo
  au Japon, Reykjavik en Islande, etc.), le survol fonctionne toujours.

## 2026-09-23 (suite 3) — Simplification de la navigation

Retour de Guillaume : trop d'écrans dont l'utilité n'est pas évidente au premier coup
d'œil. Deux actions concrètes plutôt qu'un simple réagencement visuel :

- **Fusion réelle** : "Search Engine Status" et "System Health" racontaient la même
  histoire (moteur, providers, tâches) avec une bonne partie de contenu dupliqué. Fusionnés
  en une seule page `/health` — les actions "Activer/Pause" et "Lancer un cycle
  maintenant" rejoignent les stats, le plafond de dépense, la file de tâches et le journal
  des scans. Route `/engine` supprimée, 11 pages au lieu de 12.
- **Nav en deux groupes** (`src/components/Nav.tsx`) : "Découvrir" (Dashboard, Map, Deals,
  Destinations, Alerts — l'usage quotidien) et "Réglages" (Price History, Travel Profiles,
  Calendar, Automation, Settings, System Health — configuration/technique). Chaque entrée
  porte désormais un sous-titre d'une ligne expliquant à quoi elle sert — plus aucun nom de
  page sans contexte.

## 2026-09-23 (suite 2) — Restriction à Nice comme unique aéroport de départ

Décision de Guillaume : un seul aéroport de départ actif (Nice), pour réduire le volume
de recherches réelles et donc le coût, en plus du plafond de dépense dur déjà en place.

- `scripts/restrict-to-nce.ts` : désactive les 6 autres aéroports de départ
  (MRS/LYS/TRN/MXP/LIN/GVA), annule les tâches déjà en file pour eux (effet immédiat, pas
  seulement sur les prochains cycles). Exécuté sur la base de production (288 tâches
  annulées) et en local (96 tâches).
- `prisma/seed.ts` mis à jour : les 6 aéroports restent modélisés (réactivables depuis
  Settings à tout moment) mais `allowed: false` par défaut, pour qu'une réinitialisation
  future de la base reflète ce choix sans avoir à relancer le script.
- Vérifié : `planScans()` ne crée plus que des tâches au départ de NCE.

## 2026-09-23 (suite) — Plafond de dépense dur (jamais de dépassement)

Activé le mode réel en production, puis Guillaume a demandé une garantie de ne jamais
dépasser 70€/mois. Plutôt que de promettre un chiffre approximatif, vérification empirique
du modèle tarifaire Duffel (WebSearch + WebFetch sur duffel.com/pricing, pas une
estimation de mémoire) : le ratio recherche/réservation gratuit est 1500:1 — donc 0 avec 0
réservation, ce qu'ATLAS fait toujours par conception. **Aucune recherche réelle n'est
jamais gratuite en continu avec ce provider** ; la fréquence de cron n'y change rien.

- `src/lib/engine/searchBudget.ts` : plafond de dépense mensuelle dur
  (`UserSettings.maxMonthlySearchSpendEUR`, défaut 70€). Compte les recherches non-mock du
  mois en cours (`ScanLog`), bascule de force sur le mock dès que la prochaine recherche
  dépasserait le plafond — prime sur `simulationMode`. Estimation par recherche
  volontairement majorée (0,005€) pour garder une marge de sécurité réelle.
  Une entrée `AuditLog` (déduplique à 1/jour) trace chaque bascule forcée.
  Réglable dans Settings, visible en temps réel (dépense estimée vs plafond) sur
  System Health.
- Production repassée en mode réel avec ce garde-fou actif — confirmé fonctionnel.
- 5 nouveaux tests (83 au total), dont un scénario de dépassement réel simulé à 14 000
  recherches. Build/typecheck propres.

## 2026-09-23 — Intégration Duffel (provider réel)

Guillaume a fourni ses clés Duffel (test puis live). Structure de réponse de l'API v2
validée par un appel réel avant d'écrire l'adaptateur (plutôt que de deviner depuis la
mémoire) — un appel `POST /air/offer_requests` en mode test a confirmé les noms de champs
exacts (`total_amount`, `owner.name`, `slices[].segments[].duration` en ISO8601, etc.).

- `src/lib/providers/duffel.ts` : implémente `FlightProvider`. Sémantique alignée sur le
  mock : durée/horaires/escales portent sur le tronçon aller uniquement (cohérent avec les
  règles de durée intelligente, section 4). `selfTransfer` toujours `false` (Duffel vend
  des correspondances protégées sur une même offre).
- Testé de bout en bout avec le token de test (gratuit) : recherche réelle → scoring →
  deal créé avec `provider: "duffel"`, résultat cohérent.
- **Garde-fou de coût ajouté** (`src/lib/engine/scanVolume.ts`) : dès qu'un provider réel
  est actif (`simulationMode = false`), le volume par cycle passe de 40/25 à 10/5
  (planifiées/exécutées) — répond au risque de ratio recherche/réservation documenté
  précédemment (`docs/providers.md`).
- **`simulationMode` reste à `true`** partout (local et production) : je ne l'ai pas
  activé moi-même, conformément à la règle "jamais de dépense réelle sans confirmation
  explicite". Décision à prendre avec Guillaume.
- 11 nouveaux tests (78 au total). Build/typecheck propres.

## 2026-09-15 (suite 5) — Préparation à la mise en ligne

Guillaume a précisé que la fin du développement sera une mise en ligne réelle. Le code est
maintenant prêt pour un déploiement Vercel + PostgreSQL, ce qu'il ne l'était pas avant
cette session (deux failles de sécurité auraient rendu un déploiement public imprudent) :

- **Faille corrigée** : `POST /api/engine/scan` était un endpoint totalement ouvert —
  n'importe qui aurait pu déclencher des cycles de scan (et, une fois un provider payant
  connecté, consommer du quota) simplement en le trouvant. Protégé par `CRON_SECRET`,
  envoyé automatiquement par Vercel Cron une fois la variable définie ; ouvert par défaut
  en dev local. Découvert que Vercel Cron n'appelle qu'en GET (pas seulement POST comme
  conçu initialement) — les deux méthodes déclenchent désormais un cycle.
- **Faille corrigée** : aucune authentification n'existait — n'importe qui avec l'URL
  aurait pu voir et modifier les préférences personnelles, le mandat d'achat, etc. Ajout
  d'un mot de passe unique (`SITE_PASSWORD`, adapté à un outil personnel mono-utilisateur,
  pas de système multi-comptes) via `middleware.ts` (déplacé de la racine vers `src/` —
  emplacement requis par Next.js avec un dossier `src/app`, sinon ignoré silencieusement).
  Mot de passe jamais stocké en clair (hash SHA-256 en cookie httpOnly). Inactif par
  défaut, comme `CRON_SECRET`.
- Restructuration en groupe de routes `(dashboard)` pour que `/login` reste un écran
  plein-page sans exposer le menu avant authentification.
- `vercel.json` avec cron `/api/engine/scan` toutes les 15 min (limite Hobby : 1x/jour,
  documentée).
- `ATLAS_ADMIN_SECRET` (déclaré dans `.env.example`, jamais utilisé) remplacé par
  `CRON_SECRET`, qui l'est réellement.
- `docs/deployment.md` réécrit : procédure complète Vercel + Postgres + Cron, variables
  d'environnement requises avant tout accès public.
- 6 nouveaux tests (67 au total). Vérifié dans le navigateur : redirection vers /login,
  rejet d'un mauvais mot de passe, connexion, déconnexion, endpoints publics (`/api/health`)
  non bloqués.

## 2026-09-15 (suite 4) — Canaux de notification réellement branchés

- `src/lib/alerts/channels/types.ts` exportait `channels` (IN_APP/TELEGRAM/EMAIL) mais
  rien ne l'appelait jamais depuis `maybeCreateAlert` — configurer une clé Telegram
  aujourd'hui n'aurait eu aucun effet. Corrigé : chaque alerte est diffusée sur les
  canaux dont `configured === true`. Sans clé renseignée (cas par défaut), effet nul —
  seulement `IN_APP` (déjà persisté en base) reste actif.

## 2026-09-15 (suite 3) — Tests d'intégration (section 27)

Jusqu'ici, seule la logique pure (scoring, purchase policy, durée) était testée
automatiquement ; le moteur de scan, la déduplication des alertes et les routes API
n'étaient vérifiés que manuellement (`scripts/dev-test-engine.ts`, navigateur). Section 27
demande explicitement des tests d'intégration en plus des tests unitaires.

- `tests/integration/globalSetup.ts` : base SQLite isolée (`prisma/test.db`, jamais
  `dev.db`), créée avant la suite et détruite après, via `prisma db push`.
- `tests/integration/engine.test.ts` : planification + exécution d'un cycle de scan
  complet contre la vraie base (provider mock), y compris moteur désactivé et
  destinations bannies.
- `tests/integration/alerts.test.ts` : déduplication des alertes contre la vraie base
  (pas de spam pour un deal équivalent, nouvelle alerte si le score progresse).
- `tests/integration/api.test.ts` : `GET /api/health` et `POST /api/engine/scan` appelés
  directement (sans serveur HTTP) et vérifiés contre la base de test.
- `vitest.config.ts` : `fileParallelism: false` (SQLite ne supporte pas bien l'écriture
  concurrente ; la suite reste rapide, donc sans coût réel).
- 11 nouveaux tests (61 au total). Build/typecheck propres.

## 2026-09-15 (suite 2) — Observabilité complète sur System Health (section 28)

- Dimensions manquantes ajoutées : latence moyenne des scans (24h), rythme d'observations
  actuel + projection journalière ("quotas estimés").
- Nouveau module pur `computeSystemAlerts` (testable sans DB) : détecte un moteur actif
  resté silencieux trop longtemps malgré des tâches en attente, un moteur en pause avec
  des tâches en attente, un taux d'erreur élevé (>30% = danger, >10% = avertissement).
  Affiché en carte dédiée sur System Health, uniquement quand pertinent.
- 4 nouveaux tests (50 au total). Build/typecheck propres, vérifié dans le navigateur.

## 2026-09-15 (suite) — États loading/erreur/404 (section 24)

- `src/app/loading.tsx` : squelette animé, couvre automatiquement toutes les routes sans
  loading.tsx propre (mécanisme de Suspense de l'App Router).
- `src/app/error.tsx` : error boundary stylé (remplace l'écran d'erreur générique
  Next.js), bouton "Réessayer" + retour dashboard, détail technique en dev uniquement.
- `src/app/not-found.tsx` : 404 stylé cohérent avec le thème.
- `Button` accepte désormais les props natives du `<button>` (onClick, disabled, etc.),
  nécessaire pour error.tsx qui est un composant client.

## 2026-09-15 — Audit systématique des champs du schéma, horaires interdits, escales

- Script d'audit : tous les champs de `prisma/schema.prisma` passés en revue pour
  vérifier qu'ils sont réellement lus quelque part dans `src/`. A trouvé deux nouveaux
  écarts (même famille de bug que la session précédente) :
  - `UserSettings.forbiddenHoursStart`/`forbiddenHoursEnd` (section 14, "horaires
    interdits") : totalement inutilisés. Corrigé — nouvelle carte dans Settings, branché
    dans `computeFlightQualityScore` avec gestion du passage minuit.
  - `TravelProfile.penalizeLongLayover`/`minLayoverMinutes`/`maxLayoverMinutes` : en
    base et affichés sur la page Profiles, jamais évalués par le moteur (la donnée de
    durée d'escale n'existait même pas sur `FlightOffer`/`PriceObservation`). Ajout du
    champ `layoverMinutes`, calculé par le provider mock, désormais persisté et utilisé.
- Petit polish : `Airport.country` (jamais affiché) apparaît maintenant sur la page
  Destination Explorer détail.
- 4 nouveaux tests unitaires (46 au total). Build/typecheck propres, vérifié dans le
  navigateur.

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

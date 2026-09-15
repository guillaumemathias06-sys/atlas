# ATLAS — TASKS

Roadmap détaillée. Convention : `[x]` = fait et vérifié (build + tests + vérif visuelle
quand pertinent), `[ ]` = à faire. Mis à jour à chaque session de travail.

## PHASE 1 — Foundation

- [x] Choix de stack documenté (`docs/architecture.md`)
- [x] Schéma de données complet (`prisma/schema.prisma`)
- [x] Décision SQLite (dev) / PostgreSQL (prod), documentée
- [x] Design system Tailwind (thème aviation/intelligence, dark)
- [x] États loading/erreur/404 globaux (section 24) — `loading.tsx`, `error.tsx`,
      `not-found.tsx` stylés cohérents avec le thème, couvrent toutes les routes via le
      mécanisme de Suspense/error-boundary de l'App Router
- [x] Layout + navigation (11 écrans)
- [x] Seed de démonstration (aéroports, destinations, profils, réglages)
- [x] `.env.example`, `.gitignore`, aucun secret committé

## PHASE 2 — Search Engine

- [x] Abstraction `FlightProvider` (indépendante de tout fournisseur)
- [x] Provider MOCK réaliste (prix calibrés, anomalies tarifaires de démonstration)
- [x] Planificateur de tâches (`scanPlanner.ts`) — dédup, priorité par aéroport
- [x] Exécuteur (`runner.ts`) — file de tâches DB, backoff exponentiel, fréquence
      adaptative selon le score obtenu
- [x] Historique de prix complet (`PriceObservation`)
- [x] Worker planifié (`scripts/scheduler-worker.ts`, node-cron, 24/7)
- [x] Endpoint `POST /api/engine/scan` pour déclenchement externe

## PHASE 3 — Intelligence

- [x] Fare Score (comparaison à l'historique de la route, jamais un plafond absolu)
- [x] Season Score (climat mensuel, mousson, risque cyclonique, affluence)
- [x] Experience Score (événements exceptionnels, tolérance de dates variable)
- [x] Flight Quality Score (escales, horaires, self-transfer, durée vs meilleur connu)
- [x] Duration Fit Score (règles de durée intelligente, section 4)
- [x] Preference Score (destinations prioritaires, régions favorites, compagnies bannies,
      température souhaitée, tolérance à la pluie, importance de la plage, bagages, classe
      — tous les champs `UserSettings` de la section 14 sont désormais branchés sur le
      scoring, pas seulement stockés)
- [x] ATLAS Score agrégateur, pondération configurable
- [x] Génération d'explication humaine systématique
- [x] Tests unitaires des cas limites (Nice→Rome cher, mousson, self-transfer, 35h)

## PHASE 3bis — Travel Profiles réellement appliqués

- [x] Correctif : les profils FAMILLE/COUPLE/DEAL_HUNTER étaient purement déclaratifs
      (affichés mais jamais lus par le moteur de scoring) — corrigé. Le profil actif
      module désormais : la fenêtre horaire acceptable et la sévérité du self-transfer
      dans Flight Quality Score, le nombre d'escales toléré dans Preference Score, et la
      pondération Fare/Flight de l'ATLAS Score via `applyProfileBias` (comfortWeight /
      priceWeight, somme des poids préservée). 6 nouveaux tests.

## PHASE 3ter — Tests d'intégration (section 27)

- [x] Suite d'intégration contre une vraie base SQLite isolée (`prisma/test.db`, jamais
      `dev.db`, créée/détruite automatiquement par `globalSetup.ts`) : moteur de scan de
      bout en bout (planification + exécution + persistance + scoring), déduplication des
      alertes, routes API `/api/health` et `POST /api/engine/scan`. 11 tests, 61 au total
      avec les tests unitaires.

- [x] Seuils hiérarchisés configurables (Intéressant/Bonne affaire/Grosse
      opportunité/Exceptionnel)
- [x] Déduplication (pas de spam, re-alerte seulement si amélioration notable)
- [x] Abstraction canaux (`IN_APP` actif ; `EMAIL`/`TELEGRAM` s'activent automatiquement
      dès que leurs variables d'environnement sont renseignées — correctif : le tableau
      `channels` était exporté mais jamais appelé depuis `maybeCreateAlert`)
- [x] Écran Alerts avec marquage lu/non lu
- [x] Dashboard Top Opportunities + stats (scans du jour, deals détectés, etc.)

## PHASE 9 — Préparation à la mise en ligne

Le développement se termine par une mise en ligne réelle (décision de Guillaume,
15/09/2026). Ce qui est déjà prêt côté code :

- [x] `POST`/`GET /api/engine/scan` protégé par `CRON_SECRET` (ouvert par défaut en dev
      local, verrouillé dès que la variable est définie)
- [x] Protection d'accès au site par mot de passe unique (`SITE_PASSWORD`,
      `src/middleware.ts`) — page `/login` stylée, cookie httpOnly signé par hash SHA-256
      (jamais le mot de passe en clair), déconnexion depuis la Nav. Inactif par défaut
      (dev local libre), à activer avant toute exposition publique.
- [x] Restructuration en groupe de routes `(dashboard)` pour que `/login` reste un écran
      plein-page sans exposer le menu avant authentification
- [x] `vercel.json` avec cron pointant vers `/api/engine/scan` (limite du plan Hobby
      documentée : 1 exécution/jour, Pro lève la limite)
- [x] `docs/deployment.md` réécrit avec la procédure Vercel + Postgres + Cron complète
- [x] Nettoyage : `ATLAS_ADMIN_SECRET` (jamais utilisé) remplacé par `CRON_SECRET`
      (réellement câblé)
- [ ] **Actions restant à ta charge, non automatisables** : créer un compte Vercel,
      provisionner une base Postgres, définir `SITE_PASSWORD`/`CRON_SECRET`/`DATABASE_URL`
      en production, lancer le déploiement. Étapes détaillées dans `docs/deployment.md`.

## PHASE 5 — Real Providers *(bloqué sur clé API externe — voir ci-dessous)*

- [ ] Intégration Duffel (nécessite `DUFFEL_API_KEY` — **action utilisateur requise**,
      voir `docs/providers.md`)
- [ ] Intégration météo/saisonnalité réelle (OpenWeather ou équivalent — clé API requise)
- [ ] Bascule automatique mock→réel selon configuration

## PHASE 6 — Advanced

- [x] Modèle Airport prêt pour aéroports alternatifs (priorité, coût/temps d'accès, seuil
      d'économie minimum)
- [x] Calcul "Real Departure Cost" (`src/lib/departure/realDepartureCost.ts`) —
      comparaison des aéroports alternatifs, recommandation seulement si l'économie
      dépasse le seuil propre à l'aéroport alternatif. Affiché sur la page détail d'un
      deal. Testé (cas Milan -80€ ignoré / -500€ recommandé, section 3).
- [x] True Trip Cost (billet + coût d'accès à l'aéroport, calculé à la volée — pas de
      persistance DB prématurée tant qu'aucune source hôtel/parking/transfert n'existe).
      Affiché sur la page détail d'un deal, avec mention explicite de ce qui manque.
- [ ] Open-jaw / multi-city / stopovers (non commencé — architecture à prévoir quand un
      cas d'usage concret se présente, pour éviter le sur-engineering)
- [x] Détection self-transfer (pénalisée dans Flight Quality Score, affichée en badge sur
      le détail du deal)

## PHASE 7 — Autonomy

- [x] Calendrier interne simple (`CalendarBlock`) + **UI complète** (`/calendar`, ajout/
      suppression de périodes bloquantes)
- [x] Détection de conflit calendrier (`src/lib/calendar/conflicts.ts`), branchée sur le
      détail d'un deal (badge d'avertissement) et sur l'évaluation du mandat d'achat
- [ ] Intégration Google Calendar (nécessite OAuth — **action utilisateur requise**)
- [x] Purchase Policy Engine (4 modes, kill switch, mandat déterministe)
- [x] Tests du Purchase Policy Engine (cas limites du cahier des charges)
- [x] Correctif : `forbiddenHoursStart`/`forbiddenHoursEnd` (section 14, "horaires
      interdits") étaient modélisés mais totalement inutilisés — ni dans le scoring, ni
      dans l'UI. Ajout d'un champ `layoverMinutes` sur `PriceObservation`/`FlightOffer`
      (calculé par le mock, absent avant) pour pouvoir aussi évaluer
      `penalizeLongLayover`/`minLayoverMinutes`/`maxLayoverMinutes` du profil actif, qui
      étaient déjà en base mais jamais lus par le moteur. 4 nouveaux tests.
- [x] Correctif : `allowedProfileIds`/`allowedDestinationIatas` du mandat d'achat étaient
      modélisés et déjà lus par `evaluateMandateCriteria`, mais jamais éditables dans
      l'UI Automation (champ mort côté formulaire) — corrigé, cases à cocher par profil +
      champ destinations autorisées
- [x] Approval flow UI (page Automation : liste des deals actifs évalués contre le mandat,
      bouton "Approuver (simulation)" visible seulement en mode APPROVAL_REQUIRED —
      n'effectue **aucune réservation réelle**, enregistre uniquement une décision dans
      `PurchaseAuditLog` avec `decision = SIMULATED`)
- [ ] Booking API (nécessite un partenaire de réservation + moyen de paiement —
      **action utilisateur requise, hors périmètre tant que non demandé explicitement**)

## PHASE 8bis — Observabilité complète (section 28)

- [x] Ajout des dimensions manquantes sur System Health : latence moyenne des scans
      (24h), rythme d'observations actuel + projection journalière (quotas estimés),
      alertes système calculées (`computeSystemAlerts`) — moteur silencieux malgré des
      tâches en attente, moteur en pause avec tâches en attente, taux d'erreur élevé.
      4 nouveaux tests.

## PHASE 8 — Optimisation

- [ ] Personnalisation avancée (apprentissage des préférences implicites)
- [ ] Meilleure priorisation des scans (ML optionnel)
- [ ] Migration éventuelle vers BullMQ/Redis si le volume de scans l'exige

---

## Actions utilisateur en attente (rien à retenter côté code)

1. **Clé API Duffel** (ou Amadeus/Kiwi) pour sortir du mode simulation — gratuit en
   sandbox. Créer un compte sur duffel.com, générer une clé, la mettre dans `.env` sous
   `DUFFEL_API_KEY`.
2. **Docker/PostgreSQL** — optionnel, seulement si vous voulez migrer de SQLite vers
   PostgreSQL localement plutôt qu'en production.
3. **Google Calendar OAuth** — seulement quand vous voudrez la synchronisation calendrier
   externe (Phase 7).

Aucune de ces actions ne bloque le reste du projet : tout le reste continue d'avancer en
mode simulation.

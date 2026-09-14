# ATLAS — TASKS

Roadmap détaillée. Convention : `[x]` = fait et vérifié (build + tests + vérif visuelle
quand pertinent), `[ ]` = à faire. Mis à jour à chaque session de travail.

## PHASE 1 — Foundation

- [x] Choix de stack documenté (`docs/architecture.md`)
- [x] Schéma de données complet (`prisma/schema.prisma`)
- [x] Décision SQLite (dev) / PostgreSQL (prod), documentée
- [x] Design system Tailwind (thème aviation/intelligence, dark)
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
- [x] Preference Score (destinations prioritaires, régions favorites, compagnies bannies)
- [x] ATLAS Score agrégateur, pondération configurable
- [x] Génération d'explication humaine systématique
- [x] Tests unitaires des cas limites (Nice→Rome cher, mousson, self-transfer, 35h)

## PHASE 4 — Alerts

- [x] Seuils hiérarchisés configurables (Intéressant/Bonne affaire/Grosse
      opportunité/Exceptionnel)
- [x] Déduplication (pas de spam, re-alerte seulement si amélioration notable)
- [x] Abstraction canaux (`IN_APP` actif, `EMAIL`/`TELEGRAM` préparés non connectés)
- [x] Écran Alerts avec marquage lu/non lu
- [x] Dashboard Top Opportunities + stats (scans du jour, deals détectés, etc.)

## PHASE 5 — Real Providers *(bloqué sur clé API externe — voir ci-dessous)*

- [ ] Intégration Duffel (nécessite `DUFFEL_API_KEY` — **action utilisateur requise**,
      voir `docs/providers.md`)
- [ ] Intégration météo/saisonnalité réelle (OpenWeather ou équivalent — clé API requise)
- [ ] Bascule automatique mock→réel selon configuration

## PHASE 6 — Advanced

- [x] Modèle Airport prêt pour aéroports alternatifs (priorité, coût/temps d'accès, seuil
      d'économie minimum)
- [ ] Calcul "Real Departure Cost" (comparaison aéroports alternatifs avec coût réel)
- [ ] True Trip Cost complet (parking, transfert, hôtel de départ) — modèles de données à
      créer
- [ ] Open-jaw / multi-city / stopovers
- [x] Détection self-transfer (pénalisée dans Flight Quality Score) — approfondissement
      possible (fiabilité par aéroport)

## PHASE 7 — Autonomy

- [x] Calendrier interne simple (`CalendarBlock`)
- [ ] Intégration Google Calendar (nécessite OAuth — **action utilisateur requise**)
- [x] Purchase Policy Engine (4 modes, kill switch, mandat déterministe)
- [x] Tests du Purchase Policy Engine (cas limites du cahier des charges)
- [ ] Approval flow UI (mode APPROVAL_REQUIRED avec validation humaine explicite)
- [ ] Booking API (nécessite un partenaire de réservation + moyen de paiement —
      **action utilisateur requise, hors périmètre tant que non demandé explicitement**)

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

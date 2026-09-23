# Providers

## Abstraction

`src/types/index.ts` définit l'interface `FlightProvider` :

```ts
interface FlightProvider {
  readonly name: string;
  search(query: FlightSearchQuery): Promise<FlightSearchResult>;
}
```

Le cœur du moteur (`src/lib/engine/runner.ts`) ne connaît que cette interface — jamais un
fournisseur concret. `src/lib/providers/index.ts` fait office de registre et choisit le
provider actif.

## Mock (actif par défaut)

`src/lib/providers/mock.ts` génère des offres réalistes (prix calibré sur une distance
approximative, compagnies, escales, horaires) sans aucune clé API. Des "anomalies
tarifaires" volontaires sont injectées sur quelques routes de démonstration
(NCE→NRT, NCE→JFK, MXP→BKK) pour peupler des cas pédagogiques cohérents avec le cahier des
charges (Tokyo exceptionnel, alternative Milan compétitive, etc.). Le prix "respire" dans
le temps (bucket de 6h) pour simuler un marché vivant.

## Duffel (connecté, Phase 5)

`src/lib/providers/duffel.ts` implémente `FlightProvider` contre l'API Duffel v2
(`POST /air/offer_requests?return_offers=true`), structure validée empiriquement avant
d'écrire l'adaptateur. Activé automatiquement dès que `DUFFEL_API_KEY` est configuré ET
`UserSettings.simulationMode = false` (jamais les deux à la fois par défaut — voir
"garde-fou de volume" ci-dessous).

Sémantique de mapping (voir commentaires dans le fichier) : les champs de durée/horaires/
escales portent sur le **tronçon aller uniquement** (`slices[0]`), cohérent avec les règles
de durée intelligente (section 4) qui évaluent le temps pour REJOINDRE la destination.
Les offres Duffel sont des correspondances protégées sur une même réservation —
`selfTransfer` est donc toujours `false` pour ce provider (pas de billets séparés).

Autres candidats pour diversifier plus tard :
- **Amadeus for Developers** — nécessite `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`.
- **Kiwi/Tequila** — bon pour les combinaisons multi-compagnies. Nécessite `KIWI_API_KEY`.

**Ce point bloque uniquement la Phase 5, jamais le reste du projet** : tant qu'aucune clé
n'est configurée, `UserSettings.simulationMode` reste `true` et ATLAS continue de
fonctionner intégralement en mock.

## ⚠️ Coût réel des recherches — à lire avant de connecter un provider

Duffel (et la plupart des providers) facture au-delà d'un **ratio recherche/réservation**
(ex. 1500 recherches pour 1 réservation, puis un coût par recherche excédentaire), en plus
des frais par commande. Or le principe même d'ATLAS (section 2 et 5) est de **scanner en
continu sans jamais réserver** — le ratio recherche/réservation d'ATLAS sera donc
structurellement très supérieur à ces seuils dès que le moteur tourne à pleine cadence sur
plusieurs aéroports × destinations × dates.

Conséquences pour la Phase 5, quand elle sera activée :

- Le passage en provider réel doit se faire avec une **fréquence de scan volontairement
  réduite** au départ (`SearchTask.frequencyHours` plus élevé, moins de routes actives),
  pas au rythme du mode mock qui est gratuit et donc sans contrainte de volume.
- Envisager un **cache agressif** (ne pas re-rechercher une route scannée il y a moins de
  N heures) et un **plafond de recherches/jour** configurable avant d'activer un provider
  payant.
- **Connecter un provider réel = dépense réelle progressive.** Conformément aux règles de
  sécurité du projet, cette bascule ne sera jamais faite automatiquement : elle nécessite
  ta clé API ET ta confirmation explicite, quel que soit l'état du reste du roadmap.

**Garde-fou implémenté** (`src/lib/engine/scanVolume.ts`) : dès que
`simulationMode = false`, le volume par cycle passe automatiquement de 40 tâches
planifiées / 25 exécutées (mode simulation) à **10 planifiées / 5 exécutées**. Sur le cron
de production (toutes les 15 min), ça plafonne à ~480 recherches/jour maximum au lieu de
~2400 — encore à surveiller de près au démarrage, mais une réduction volontaire avant
d'aller plus loin (fréquence de cron, cache par route) si le volume doit encore baisser.

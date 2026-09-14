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

## Providers réels (Phase 5, non connectés)

Pour brancher un fournisseur réel :

1. Créer `src/lib/providers/<nom>.ts` implémentant `FlightProvider`.
2. L'enregistrer dans `registry` (`src/lib/providers/index.ts`).
3. Ajouter la clé API correspondante dans `.env` (voir `.env.example`).

Candidats recommandés, par ordre de préférence :

- **Duffel** — sandbox gratuite, données réelles, API moderne. Nécessite `DUFFEL_API_KEY`.
- **Amadeus for Developers** — alternative établie. Nécessite `AMADEUS_CLIENT_ID` /
  `AMADEUS_CLIENT_SECRET`.
- **Kiwi/Tequila** — bon pour les combinaisons multi-compagnies. Nécessite
  `KIWI_API_KEY`.

**Ce point bloque uniquement la Phase 5, jamais le reste du projet** : tant qu'aucune clé
n'est configurée, `UserSettings.simulationMode` reste `true` et ATLAS continue de
fonctionner intégralement en mock.

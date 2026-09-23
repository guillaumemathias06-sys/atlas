// Registre de providers — architecture multi-fournisseurs (section 5).
// Le cœur d'ATLAS ne dépend jamais d'un seul fournisseur : il consomme
// l'interface FlightProvider, quel que soit le provider actif.
import type { FlightProvider } from "@/types";
import { mockProvider } from "./mock";
import { DuffelFlightProvider } from "./duffel";

function buildRegistry(): Record<string, FlightProvider> {
  const registry: Record<string, FlightProvider> = { mock: mockProvider };
  if (process.env.DUFFEL_API_KEY) {
    registry["duffel"] = new DuffelFlightProvider(process.env.DUFFEL_API_KEY);
  }
  // Phase 5+: brancher ici AmadeusProvider, KiwiProvider...
  return registry;
}

/**
 * Provider actif. `preferReal` reflète `!UserSettings.simulationMode` — tant que ce
 * réglage reste à `true` (par défaut), ATLAS reste en mock quoi qu'il arrive, même si une
 * clé API réelle est configurée. Voir docs/providers.md (coût des recherches).
 */
export function getActiveProvider(preferReal = false): FlightProvider {
  const registry = buildRegistry();
  if (preferReal && registry["duffel"]) {
    return registry["duffel"]!;
  }
  return registry["mock"]!;
}

export function listProviders(): { name: string; configured: boolean }[] {
  return [
    { name: "mock", configured: true },
    { name: "duffel", configured: Boolean(process.env.DUFFEL_API_KEY) },
    { name: "amadeus", configured: Boolean(process.env.AMADEUS_CLIENT_ID) },
  ];
}

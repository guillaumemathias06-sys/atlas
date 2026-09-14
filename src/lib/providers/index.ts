// Registre de providers — architecture multi-fournisseurs (section 5).
// Le cœur d'ATLAS ne dépend jamais d'un seul fournisseur : il consomme
// l'interface FlightProvider, quel que soit le provider actif.
import type { FlightProvider } from "@/types";
import { mockProvider } from "./mock";

const registry: Record<string, FlightProvider> = {
  mock: mockProvider,
  // Phase 5: brancher ici DuffelProvider, AmadeusProvider, KiwiProvider...
  // duffel: new DuffelProvider(process.env.DUFFEL_API_KEY),
};

/** Provider actif. Pour l'instant contrôlé par simulationMode dans UserSettings (toujours mock si aucune clé n'est configurée). */
export function getActiveProvider(preferReal = false): FlightProvider {
  if (preferReal && process.env.DUFFEL_API_KEY && registry["duffel"]) {
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

// Score de préférences personnelles (section 14) — pénalise ce que l'utilisateur exclut,
// bonifie ce qu'il priorise.
import { clamp } from "@/lib/utils/stats";

export interface PreferenceInput {
  destinationIata: string;
  region?: string;
  airline: string;
  stops: number;
  priorityDestinations: string[];
  favoriteRegions: string[];
  bannedAirlines: string[];
  maxStopsPreference: number;
}

export function computePreferenceScore(input: PreferenceInput): { score: number; reasons: string[] } {
  let score = 70; // neutre par défaut
  const reasons: string[] = [];

  if (input.priorityDestinations.includes(input.destinationIata)) {
    score += 20;
    reasons.push("destination prioritaire pour vous");
  }
  if (input.region && input.favoriteRegions.includes(input.region)) {
    score += 10;
    reasons.push("région favorite");
  }
  if (input.bannedAirlines.includes(input.airline)) {
    score -= 40;
    reasons.push("compagnie normalement exclue");
  }
  if (input.stops > input.maxStopsPreference) {
    score -= 15;
    reasons.push("plus d'escales que votre préférence");
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

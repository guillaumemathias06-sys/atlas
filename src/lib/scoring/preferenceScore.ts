// Score de préférences personnelles (section 14) — pénalise ce que l'utilisateur exclut,
// bonifie ce qu'il priorise. Couvre destinations/régions/compagnies/escales ainsi que
// confort (météo, plage, pluie) et exigences pratiques (bagages, classe).
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

  baggageIncluded: boolean;
  requiredBaggage: string; // "NONE" | "CARRY_ON" | "CHECKED"
  cabinClass: string;
  preferredCabinClass: string;

  destinationAvgTempC?: number | null;
  preferredTempMinC: number;
  preferredTempMaxC: number;
  weatherImportance: number; // 0-100

  destinationRainfallMm?: number | null;
  rainTolerance: number; // 0-100, haut = tolère bien la pluie

  isBeachDestination?: boolean;
  beachImportance: number; // 0-100
}

const CABIN_RANK: Record<string, number> = { ECONOMY: 0, PREMIUM_ECONOMY: 1, BUSINESS: 2, FIRST: 3 };

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

  // Bagages
  if (input.requiredBaggage !== "NONE" && !input.baggageIncluded) {
    score -= 10;
    reasons.push("bagage requis non inclus");
  }

  // Classe (une classe supérieure à la préférence n'est jamais pénalisée)
  const wantedRank = CABIN_RANK[input.preferredCabinClass] ?? 0;
  const gotRank = CABIN_RANK[input.cabinClass] ?? 0;
  if (gotRank < wantedRank) {
    score -= 8;
    reasons.push("classe inférieure à votre préférence");
  }

  // Météo — seulement si l'utilisateur y attache de l'importance et qu'on a une donnée
  if (input.weatherImportance > 0 && input.destinationAvgTempC != null) {
    const weight = input.weatherImportance / 100;
    if (input.destinationAvgTempC < input.preferredTempMinC) {
      const deficit = input.preferredTempMinC - input.destinationAvgTempC;
      score -= clamp(deficit * 1.5 * weight, 0, 20);
      reasons.push("température sous vos préférences");
    } else if (input.destinationAvgTempC > input.preferredTempMaxC) {
      const excess = input.destinationAvgTempC - input.preferredTempMaxC;
      score -= clamp(excess * 1.5 * weight, 0, 20);
      reasons.push("température au-dessus de vos préférences");
    } else {
      score += clamp(8 * weight, 0, 8);
    }
  }

  // Pluie — pénalise seulement si la tolérance est basse
  if (input.destinationRainfallMm != null && input.destinationRainfallMm > 100) {
    const intolerance = (100 - input.rainTolerance) / 100;
    if (intolerance > 0) {
      const rainSeverity = clamp((input.destinationRainfallMm - 100) / 200, 0, 1);
      const penalty = rainSeverity * intolerance * 20;
      if (penalty >= 1) {
        score -= penalty;
        reasons.push("précipitations élevées, sous votre tolérance à la pluie");
      }
    }
  }

  // Plage
  if (input.beachImportance > 0) {
    const weight = input.beachImportance / 100;
    if (input.isBeachDestination) {
      score += clamp(15 * weight, 0, 15);
      reasons.push("destination balnéaire, comme vous le préférez");
    } else {
      score -= clamp(10 * weight, 0, 10);
    }
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

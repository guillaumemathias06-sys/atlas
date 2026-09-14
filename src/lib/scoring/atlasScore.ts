// ATLAS SCORE — agrégateur principal (section 11)
import { clamp } from "@/lib/utils/stats";

export interface AtlasWeights {
  weightFare: number;
  weightSeason: number;
  weightExperience: number;
  weightFlight: number;
  weightDuration: number;
  weightPreference: number;
}

export const DEFAULT_WEIGHTS: AtlasWeights = {
  weightFare: 0.35,
  weightSeason: 0.2,
  weightExperience: 0.15,
  weightFlight: 0.1,
  weightDuration: 0.1,
  weightPreference: 0.1,
};

export interface AtlasScoreInputs {
  fareScore: number;
  seasonScore: number;
  experienceScore: number;
  flightQualityScore: number;
  durationFitScore: number;
  preferenceScore: number;
}

export function computeAtlasScore(inputs: AtlasScoreInputs, weights: AtlasWeights = DEFAULT_WEIGHTS): number {
  const totalWeight =
    weights.weightFare + weights.weightSeason + weights.weightExperience +
    weights.weightFlight + weights.weightDuration + weights.weightPreference;
  const w = totalWeight > 0 ? totalWeight : 1;

  const raw =
    (inputs.fareScore * weights.weightFare +
      inputs.seasonScore * weights.weightSeason +
      inputs.experienceScore * weights.weightExperience +
      inputs.flightQualityScore * weights.weightFlight +
      inputs.durationFitScore * weights.weightDuration +
      inputs.preferenceScore * weights.weightPreference) /
    w;

  return clamp(Math.round(raw), 0, 100);
}

export interface ExplanationInputs {
  destinationCity: string;
  atlasScore: number;
  vsMedianPct: number;
  seasonReasons: string[];
  matchedEvents: string[];
  flightReasons: string[];
  stops: number;
  seasonScore: number;
  experienceScore: number;
}

/** Génère une explication humaine — ATLAS n'affiche jamais un chiffre seul (section 11). */
export function generateExplanation(input: ExplanationInputs): string {
  const parts: string[] = [];

  parts.push(`Score ${input.atlasScore}/100 pour ${input.destinationCity}.`);

  if (input.vsMedianPct < -5) {
    parts.push(`Le tarif est ${Math.abs(Math.round(input.vsMedianPct))}% sous le prix médian observé sur cette route.`);
  } else if (input.vsMedianPct > 5) {
    parts.push(`Le tarif est ${Math.round(input.vsMedianPct)}% au-dessus du prix médian habituel.`);
  } else {
    parts.push("Le tarif est proche du prix médian habituel.");
  }

  if (input.seasonScore >= 80) {
    parts.push("La période est excellente pour visiter cette destination.");
  } else if (input.seasonScore < 50) {
    parts.push("La période n'est pas idéale climatiquement pour cette destination.");
  }

  if (input.matchedEvents.length > 0) {
    parts.push(`Le voyage coïncide avec : ${input.matchedEvents.join(", ")}.`);
  }

  if (input.stops === 0) {
    parts.push("Le vol est direct.");
  } else if (input.stops === 1) {
    parts.push("Le trajet n'a qu'une escale raisonnable.");
  } else {
    parts.push(`Le trajet comporte ${input.stops} escales.`);
  }

  if (input.flightReasons.length > 0) {
    parts.push(`Points d'attention : ${input.flightReasons.join(", ")}.`);
  }

  return parts.join(" ");
}

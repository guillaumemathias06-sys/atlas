// Flight Quality Score (section 10)
import { clamp } from "@/lib/utils/stats";

export interface FlightQualityInput {
  stops: number;
  totalDurationMinutes: number;
  bestKnownDurationMinutes: number; // meilleur trajet connu sur la route (pour comparaison)
  departTime: string; // HH:mm
  arriveTime: string; // HH:mm
  selfTransfer: boolean;
  baggageIncluded: boolean;
  airportChange?: boolean;
}

function hourOf(hhmm: string): number {
  const parts = hhmm.split(":");
  return Number(parts[0] ?? 0);
}

export function computeFlightQualityScore(input: FlightQualityInput): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];

  // Escales
  if (input.stops === 1) {
    score -= 10;
  } else if (input.stops >= 2) {
    score -= 10 + (input.stops - 1) * 15;
    reasons.push(`${input.stops} escales`);
  }

  // Durée vs meilleur trajet connu
  if (input.bestKnownDurationMinutes > 0) {
    const extraRatio = (input.totalDurationMinutes - input.bestKnownDurationMinutes) / input.bestKnownDurationMinutes;
    if (extraRatio > 0.15) {
      const penalty = clamp(extraRatio * 60, 0, 35);
      score -= penalty;
      reasons.push("trajet nettement plus long que le meilleur itinéraire connu");
    }
  }

  // Trajet excessivement long en absolu (>30h) — pénalité forte quel que soit le prix
  if (input.totalDurationMinutes > 30 * 60) {
    score -= 25;
    reasons.push("trajet total supérieur à 30h");
  }

  // Horaires
  const depH = hourOf(input.departTime);
  const arrH = hourOf(input.arriveTime);
  if (depH < 6 || depH >= 22) {
    score -= 8;
    reasons.push("départ à horaire extrême");
  }
  if (arrH >= 23 || arrH < 5) {
    score -= 8;
    reasons.push("arrivée tardive/nocturne");
  }

  // Correspondance non protégée
  if (input.selfTransfer) {
    score -= 20;
    reasons.push("correspondance non protégée (self-transfer)");
  }

  if (input.airportChange) {
    score -= 10;
    reasons.push("changement d'aéroport lors de l'escale");
  }

  if (!input.baggageIncluded) {
    score -= 5;
    reasons.push("bagage non inclus");
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

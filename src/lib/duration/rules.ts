// Durée intelligente des séjours (section 4)
import type { DurationRule } from "@/types";

export const DEFAULT_DURATION_RULES: DurationRule[] = [
  { maxTravelHours: 2, minStayDays: 2 },
  { maxTravelHours: 4, minStayDays: 4 },
  { maxTravelHours: 7, minStayDays: 7 },
  { maxTravelHours: 10, minStayDays: 10 },
  { maxTravelHours: 999, minStayDays: 15 },
];

/** Renvoie le séjour minimum (en jours) recommandé pour un temps de trajet total donné. */
export function minStayDaysFor(totalTravelHours: number, rules: DurationRule[] = DEFAULT_DURATION_RULES): number {
  const sorted = [...rules].sort((a, b) => a.maxTravelHours - b.maxTravelHours);
  for (const rule of sorted) {
    if (totalTravelHours <= rule.maxTravelHours) return rule.minStayDays;
  }
  return sorted[sorted.length - 1]?.minStayDays ?? 15;
}

/**
 * Score d'adéquation durée trajet / durée séjour (0-100).
 * 100 si le séjour est >= durée idéale (2x le minimum, plafonné), dégradé
 * linéairement en dessous du minimum requis, et légèrement pénalisé si le
 * séjour est démesurément long par rapport au trajet (dilution de l'intérêt).
 */
export function durationFitScore(
  totalTravelHours: number,
  tripLengthDays: number,
  rules: DurationRule[] = DEFAULT_DURATION_RULES
): number {
  const minStay = minStayDaysFor(totalTravelHours, rules);
  const idealStay = minStay * 2;
  const maxAcceptable = minStay * 6;

  if (tripLengthDays < minStay) {
    // pénalité proportionnelle au déficit
    const deficitRatio = (minStay - tripLengthDays) / minStay;
    return Math.max(0, Math.round(100 - deficitRatio * 140));
  }
  if (tripLengthDays <= idealStay) {
    // entre minStay et idealStay : score croissant de 70 à 100
    const ratio = (tripLengthDays - minStay) / Math.max(1, idealStay - minStay);
    return Math.round(70 + ratio * 30);
  }
  if (tripLengthDays <= maxAcceptable) {
    // au-delà de l'idéal, léger déclin doux
    const ratio = (tripLengthDays - idealStay) / Math.max(1, maxAcceptable - idealStay);
    return Math.round(100 - ratio * 15);
  }
  return 80; // très long séjour : reste correct mais pas optimal
}

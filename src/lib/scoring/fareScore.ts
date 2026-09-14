// Fare Intelligence (section 7)
// Le score ne doit JAMAIS reposer uniquement sur un plafond de prix absolu :
// il compare le prix observé à l'historique de LA MÊME route.
import { mean, median, min, stddev, clamp, percentileOf } from "@/lib/utils/stats";

export interface FareScoreInput {
  currentPrice: number;
  historicalPrices: number[]; // prix passés observés sur la même route (hors observation courante)
}

export interface FareScoreResult {
  score: number; // 0-100
  vsMedianPct: number; // négatif = moins cher que la médiane
  vsAvgPct: number;
  vsAllTimeLowPct: number;
  percentile: number; // percentile du prix actuel dans l'historique (bas = bon)
  historyDepth: number;
}

export function computeFareScore(input: FareScoreInput): FareScoreResult {
  const { currentPrice, historicalPrices } = input;
  const historyDepth = historicalPrices.length;

  if (historyDepth < 3) {
    // Pas assez d'historique : score neutre-prudent, on ne peut pas juger la rareté.
    return {
      score: 50,
      vsMedianPct: 0,
      vsAvgPct: 0,
      vsAllTimeLowPct: 0,
      percentile: 50,
      historyDepth,
    };
  }

  const med = median(historicalPrices);
  const avg = mean(historicalPrices);
  const low = min(historicalPrices);
  const sd = stddev(historicalPrices);

  const vsMedianPct = med > 0 ? ((currentPrice - med) / med) * 100 : 0;
  const vsAvgPct = avg > 0 ? ((currentPrice - avg) / avg) * 100 : 0;
  const vsAllTimeLowPct = low > 0 ? ((currentPrice - low) / low) * 100 : 0;
  const percentile = percentileOf(currentPrice, historicalPrices); // bas percentile = prix bas = bon

  // Composante 1 : position vs médiane, normalisée par l'écart-type (z-score inversé)
  const z = sd > 0 ? (med - currentPrice) / sd : (med - currentPrice) / Math.max(1, med * 0.15);
  const zScoreComponent = clamp(50 + z * 20, 0, 100);

  // Composante 2 : rareté — être proche ou sous le plus bas historique est très fort signal
  const rarityComponent = clamp(100 - vsAllTimeLowPct * 1.4, 0, 100);

  // Composante 3 : percentile inversé (bas percentile => haut score)
  const percentileComponent = 100 - percentile;

  // Composante 4 : profondeur d'historique — plus on a de données, plus on fait confiance au score
  const confidence = clamp(historyDepth / 30, 0.4, 1); // 40% de poids mini même avec peu d'historique

  const raw = zScoreComponent * 0.45 + rarityComponent * 0.35 + percentileComponent * 0.2;
  const score = clamp(Math.round(raw * confidence + 50 * (1 - confidence)), 0, 100);

  return {
    score,
    vsMedianPct: Math.round(vsMedianPct * 10) / 10,
    vsAvgPct: Math.round(vsAvgPct * 10) / 10,
    vsAllTimeLowPct: Math.round(vsAllTimeLowPct * 10) / 10,
    percentile,
    historyDepth,
  };
}

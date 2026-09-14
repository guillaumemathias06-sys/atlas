// Real Departure Cost — comparaison des aéroports de départ alternatifs (section 18).
// Un vol moins cher au départ d'un autre aéroport n'est un "vrai" bon plan que si
// l'économie dépasse le coût/temps supplémentaire pour s'y rendre.
import { prisma } from "@/lib/db";

export interface DepartureOption {
  originId: string;
  originIata: string;
  originCity: string;
  bestFlightPriceEUR: number;
  accessCostEUR: number;
  accessTimeMinutes: number;
  totalRealCostEUR: number;
  minSavingsToUseEUR: number;
  observedAt: Date;
}

export interface DepartureComparison {
  chosen: DepartureOption | null;
  alternatives: DepartureOption[];
  recommended: DepartureOption | null; // meilleure alternative si elle dépasse son propre seuil d'économie
}

/**
 * Logique pure (testable sans DB) : étant donné l'option choisie et les alternatives,
 * détermine la meilleure alternative à recommander — seulement si son économie sur le
 * coût réel dépasse SON PROPRE seuil `minSavingsToUseEUR`.
 */
export function pickRecommendedAlternative(chosen: DepartureOption, alternatives: DepartureOption[]): DepartureOption | null {
  let recommended: DepartureOption | null = null;
  for (const alt of alternatives) {
    const savings = chosen.totalRealCostEUR - alt.totalRealCostEUR;
    if (savings >= alt.minSavingsToUseEUR && savings > 0) {
      if (!recommended || alt.totalRealCostEUR < recommended.totalRealCostEUR) recommended = alt;
    }
  }
  return recommended;
}

/**
 * Compare, pour une destination donnée, le meilleur prix récent observé depuis chaque
 * aéroport de départ autorisé, et calcule le "coût réel" (prix du billet + coût d'accès
 * à l'aéroport). Une alternative n'est recommandée que si son économie sur le coût réel
 * dépasse SON PROPRE seuil `minSavingsToUseEUR` (section 3 : Milan à -80€ ignoré, -500€
 * recommandé).
 */
export async function compareDepartureOptions(destinationId: string, chosenOriginId?: string): Promise<DepartureComparison> {
  const origins = await prisma.airport.findMany({ where: { isOrigin: true, allowed: true } });
  if (origins.length === 0) return { chosen: null, alternatives: [], recommended: null };

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 45); // 45 jours de fraîcheur

  const options: DepartureOption[] = [];
  for (const origin of origins) {
    const best = await prisma.priceObservation.findFirst({
      where: { originId: origin.id, destinationId, observedAt: { gte: since } },
      orderBy: { priceEUR: "asc" },
    });
    if (!best) continue;
    const accessCostEUR = origin.accessCostEUR ?? 0;
    options.push({
      originId: origin.id,
      originIata: origin.iata,
      originCity: origin.city,
      bestFlightPriceEUR: best.priceEUR,
      accessCostEUR,
      accessTimeMinutes: origin.accessTimeMinutes ?? 0,
      totalRealCostEUR: best.priceEUR + accessCostEUR,
      minSavingsToUseEUR: origin.minSavingsToUseEUR,
      observedAt: best.observedAt,
    });
  }

  options.sort((a, b) => a.totalRealCostEUR - b.totalRealCostEUR);

  const chosen = options.find((o) => o.originId === chosenOriginId) ?? options[0] ?? null;
  const alternatives = options.filter((o) => o.originId !== chosen?.originId);
  const recommended = chosen ? pickRecommendedAlternative(chosen, alternatives) : null;

  return { chosen, alternatives, recommended };
}

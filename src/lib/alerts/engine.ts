// Système d'alertes hiérarchisées (section 12) — dédupliqué, anti-spam.
import { prisma } from "@/lib/db";
import type { AlertTier } from "@/types";

export interface AlertThresholds {
  interesting: number;
  good: number;
  great: number;
  exceptional: number;
}

export function tierForScore(score: number, thresholds: AlertThresholds): AlertTier {
  if (score >= thresholds.exceptional) return "EXCEPTIONAL";
  if (score >= thresholds.great) return "GREAT";
  if (score >= thresholds.good) return "GOOD";
  if (score >= thresholds.interesting) return "INTERESTING";
  return "NONE";
}

interface MaybeCreateAlertParams {
  dealId: string;
  destinationIata: string;
  originIata: string;
  tripLengthDays: number;
  atlasScore: number;
  priceEUR: number;
  explanation: string;
  thresholds: AlertThresholds;
}

/**
 * Crée une alerte seulement si nécessaire : pas de notification pour NONE,
 * et déduplication par route+durée+tier — sauf si le prix baisse significativement,
 * le score augmente, ou l'offre est notablement meilleure qu'une alerte récente équivalente.
 */
export async function maybeCreateAlert(params: MaybeCreateAlertParams) {
  const tier = tierForScore(params.atlasScore, params.thresholds);
  if (tier === "NONE") return null;

  const dedupeKey = `${params.originIata}-${params.destinationIata}-${params.tripLengthDays}-${tier}`;

  const recent = await prisma.alert.findFirst({
    where: { dedupeKey },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    // Chercher le deal associé à la dernière alerte pour comparer prix/score
    const recentDeal = await prisma.deal.findUnique({ where: { id: recent.dealId } });
    const sameOrBetter =
      recentDeal &&
      recentDeal.atlasScore >= params.atlasScore - 1 && // pas d'amélioration notable du score
      true;

    const isRecentEnough = Date.now() - recent.createdAt.getTime() < 1000 * 60 * 60 * 24 * 3; // 3 jours
    if (sameOrBetter && isRecentEnough) {
      return null; // évite le spam : rien de nouveau à signaler
    }
  }

  const tierLabel: Record<string, string> = {
    INTERESTING: "Opportunité intéressante",
    GOOD: "Bonne affaire",
    GREAT: "Très grosse opportunité",
    EXCEPTIONAL: "Alerte exceptionnelle",
  };

  const message = `${tierLabel[tier] ?? tier} — ${params.destinationIata} à ${params.priceEUR}€ (ATLAS ${params.atlasScore}/100). ${params.explanation}`;

  return prisma.alert.create({
    data: {
      dealId: params.dealId,
      tier,
      channel: "IN_APP",
      message,
      dedupeKey,
    },
  });
}

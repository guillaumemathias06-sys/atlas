// Construit les PurchaseCandidate à partir des deals actifs, pour l'aperçu d'éligibilité
// au mandat affiché sur la page Automation (mode APPROVAL_REQUIRED / ALERT).
import { prisma } from "@/lib/db";
import { evaluateMandateCriteria, type PurchaseMandate, type PurchaseCandidate, type PolicyDecision } from "./policyEngine";
import { hasCalendarConflict } from "@/lib/calendar/conflicts";

export interface CandidateEvaluation {
  dealId: string;
  destinationCity: string;
  destinationIata: string;
  originIata: string;
  priceEUR: number;
  atlasScore: number;
  seasonScore: number;
  decision: PolicyDecision;
}

function safeJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getEligibleCandidates(limit = 10): Promise<CandidateEvaluation[]> {
  const [policy, settings, calendarBlocks, deals] = await Promise.all([
    prisma.purchasePolicy.findUniqueOrThrow({ where: { id: "singleton" } }),
    prisma.userSettings.findUniqueOrThrow({ where: { id: "singleton" } }),
    prisma.calendarBlock.findMany({ where: { blocking: true } }),
    prisma.deal.findMany({
      where: { status: "ACTIVE" },
      orderBy: { atlasScore: "desc" },
      take: limit,
      include: { observation: { include: { destination: true, origin: true } } },
    }),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const purchasesThisMonthLogs = await prisma.purchaseAuditLog.findMany({
    where: { decision: "SIMULATED", createdAt: { gte: startOfMonth } },
  });
  const purchasesThisMonth = purchasesThisMonthLogs.length;
  // Coût simulé pas stocké séparément en V1 : approximation prudente à 0 (pas de vrai
  // montant dépensé puisqu'aucun achat réel n'existe). Documenté dans docs/security.md.
  const spentThisMonthEUR = 0;

  const mandate: PurchaseMandate = {
    mode: policy.mode as PurchaseMandate["mode"],
    killSwitchEngaged: policy.killSwitchEngaged,
    maxPricePerPersonEUR: policy.maxPricePerPersonEUR,
    maxBookingTotalEUR: policy.maxBookingTotalEUR,
    minAtlasScore: policy.minAtlasScore,
    minSeasonScore: policy.minSeasonScore,
    maxStops: policy.maxStops,
    requireProtectedConnection: policy.requireProtectedConnection,
    allowedProfileIds: safeJsonArray(policy.allowedProfileIds),
    maxPurchasesPerMonth: policy.maxPurchasesPerMonth,
    maxMonthlyBudgetEUR: policy.maxMonthlyBudgetEUR,
    allowedDestinationIatas: safeJsonArray(policy.allowedDestinationIatas),
  };

  return deals.map((deal) => {
    const obs = deal.observation;
    const candidate: PurchaseCandidate = {
      destinationIata: obs.destination.iata,
      pricePerPersonEUR: obs.priceEUR,
      bookingTotalEUR: obs.priceEUR,
      atlasScore: deal.atlasScore,
      seasonScore: deal.seasonScore,
      stops: obs.stops,
      selfTransfer: obs.selfTransfer,
      activeProfileId: settings.activeProfileId,
      calendarConflict: hasCalendarConflict(obs.departDate, obs.returnDate, calendarBlocks),
      purchasesThisMonth,
      spentThisMonthEUR,
    };

    return {
      dealId: deal.id,
      destinationCity: obs.destination.city,
      destinationIata: obs.destination.iata,
      originIata: obs.origin.iata,
      priceEUR: obs.priceEUR,
      atlasScore: deal.atlasScore,
      seasonScore: deal.seasonScore,
      decision: evaluateMandateCriteria(mandate, candidate),
    };
  });
}

// Purchase Policy Engine — architecture V2/V3 (section 21)
//
// RÈGLE ABSOLUE : ce moteur ne déclenche JAMAIS de dépense réelle. Il n'existe
// aujourd'hui aucune intégration de paiement/réservation dans ATLAS. Ce fichier
// prépare uniquement l'architecture déterministe qui, plus tard, gouvernera un
// éventuel achat autonome — et même alors, uniquement si :
//   1. killSwitchEngaged === false (le kill switch est désactivé par défaut = ON)
//   2. mode === AUTONOMOUS_PURCHASE (désactivé par défaut, l'utilisateur doit le choisir)
//   3. TOUTES les conditions du mandat sont vraies.
// L'IA n'a aucun pouvoir de contourner ces règles : evaluate() est une pure
// fonction déterministe, sans appel LLM.
import type { PurchaseMode } from "@/types";

export interface PurchaseMandate {
  mode: PurchaseMode;
  killSwitchEngaged: boolean;
  maxPricePerPersonEUR: number;
  maxBookingTotalEUR: number;
  minAtlasScore: number;
  minSeasonScore: number;
  maxStops: number;
  requireProtectedConnection: boolean;
  allowedProfileIds: string[];
  maxPurchasesPerMonth: number;
  maxMonthlyBudgetEUR: number;
  allowedDestinationIatas: string[];
}

export interface PurchaseCandidate {
  destinationIata: string;
  pricePerPersonEUR: number;
  bookingTotalEUR: number;
  atlasScore: number;
  seasonScore: number;
  stops: number;
  selfTransfer: boolean;
  activeProfileId: string | null;
  calendarConflict: boolean;
  purchasesThisMonth: number;
  spentThisMonthEUR: number;
}

export interface PolicyDecision {
  approved: boolean;
  reasons: string[]; // toutes les règles évaluées, avec verdict
}

export function evaluatePurchase(mandate: PurchaseMandate, candidate: PurchaseCandidate): PolicyDecision {
  const reasons: string[] = [];
  let approved = true;

  function check(condition: boolean, label: string) {
    reasons.push(`${condition ? "OK" : "REJET"} — ${label}`);
    if (!condition) approved = false;
  }

  // Le kill switch et le mode priment sur tout le reste.
  check(!mandate.killSwitchEngaged, "kill switch désactivé");
  check(mandate.mode === "AUTONOMOUS_PURCHASE", "mode = AUTONOMOUS_PURCHASE");

  check(candidate.pricePerPersonEUR <= mandate.maxPricePerPersonEUR, `prix/personne ≤ ${mandate.maxPricePerPersonEUR}€`);
  check(candidate.bookingTotalEUR <= mandate.maxBookingTotalEUR, `total réservation ≤ ${mandate.maxBookingTotalEUR}€`);
  check(candidate.atlasScore >= mandate.minAtlasScore, `ATLAS Score ≥ ${mandate.minAtlasScore}`);
  check(candidate.seasonScore >= mandate.minSeasonScore, `Season Score ≥ ${mandate.minSeasonScore}`);
  check(candidate.stops <= mandate.maxStops, `escales ≤ ${mandate.maxStops}`);

  if (mandate.requireProtectedConnection) {
    check(!candidate.selfTransfer, "correspondance protégée (pas de self-transfer)");
  }

  if (mandate.allowedProfileIds.length > 0) {
    check(
      candidate.activeProfileId !== null && mandate.allowedProfileIds.includes(candidate.activeProfileId),
      "profil de voyage autorisé"
    );
  }

  check(!candidate.calendarConflict, "aucun conflit calendrier");

  check(candidate.purchasesThisMonth < mandate.maxPurchasesPerMonth, `moins de ${mandate.maxPurchasesPerMonth} achats ce mois-ci`);
  check(
    candidate.spentThisMonthEUR + candidate.bookingTotalEUR <= mandate.maxMonthlyBudgetEUR,
    `budget mensuel (${mandate.maxMonthlyBudgetEUR}€) respecté`
  );

  if (mandate.allowedDestinationIatas.length > 0) {
    check(mandate.allowedDestinationIatas.includes(candidate.destinationIata), "destination autorisée");
  }

  return { approved, reasons };
}

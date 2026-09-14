import { describe, it, expect } from "vitest";
import { evaluatePurchase, type PurchaseMandate, type PurchaseCandidate } from "@/lib/purchase/policyEngine";

const baseMandate: PurchaseMandate = {
  mode: "AUTONOMOUS_PURCHASE",
  killSwitchEngaged: false,
  maxPricePerPersonEUR: 300,
  maxBookingTotalEUR: 600,
  minAtlasScore: 98,
  minSeasonScore: 85,
  maxStops: 1,
  requireProtectedConnection: true,
  allowedProfileIds: [],
  maxPurchasesPerMonth: 5,
  maxMonthlyBudgetEUR: 2000,
  allowedDestinationIatas: [],
};

const baseCandidate: PurchaseCandidate = {
  destinationIata: "NRT",
  pricePerPersonEUR: 250,
  bookingTotalEUR: 500,
  atlasScore: 99,
  seasonScore: 90,
  stops: 0,
  selfTransfer: false,
  activeProfileId: null,
  calendarConflict: false,
  purchasesThisMonth: 0,
  spentThisMonthEUR: 0,
};

describe("Purchase Policy Engine (section 21) — sécurité avant tout", () => {
  it("REJETTE tout achat si le kill switch est engagé, même si tout le reste est parfait", () => {
    const mandate = { ...baseMandate, killSwitchEngaged: true };
    const decision = evaluatePurchase(mandate, baseCandidate);
    expect(decision.approved).toBe(false);
  });

  it("REJETTE tout achat si le mode n'est pas AUTONOMOUS_PURCHASE", () => {
    const mandate = { ...baseMandate, mode: "APPROVAL_REQUIRED" as const };
    const decision = evaluatePurchase(mandate, baseCandidate);
    expect(decision.approved).toBe(false);
  });

  it("cas limite explicite du cahier des charges : Score 98 mais Season Score 50 => aucun achat si mandat impose Season > 85", () => {
    const candidate = { ...baseCandidate, atlasScore: 98, seasonScore: 50 };
    const decision = evaluatePurchase(baseMandate, candidate);
    expect(decision.approved).toBe(false);
    expect(decision.reasons.some((r) => r.startsWith("REJET") && r.includes("Season Score"))).toBe(true);
  });

  it("REJETTE un self-transfer risqué même si le prix est excellent", () => {
    const candidate = { ...baseCandidate, selfTransfer: true };
    const decision = evaluatePurchase(baseMandate, candidate);
    expect(decision.approved).toBe(false);
  });

  it("REJETTE si le budget mensuel serait dépassé", () => {
    const candidate = { ...baseCandidate, spentThisMonthEUR: 1800, bookingTotalEUR: 500 };
    const decision = evaluatePurchase(baseMandate, candidate);
    expect(decision.approved).toBe(false);
  });

  it("APPROUVE seulement quand TOUTES les conditions sont vraies", () => {
    const decision = evaluatePurchase(baseMandate, baseCandidate);
    expect(decision.approved).toBe(true);
    expect(decision.reasons.every((r) => r.startsWith("OK"))).toBe(true);
  });
});

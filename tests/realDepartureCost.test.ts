import { describe, it, expect } from "vitest";
import { pickRecommendedAlternative, type DepartureOption } from "@/lib/departure/realDepartureCost";

function option(overrides: Partial<DepartureOption>): DepartureOption {
  return {
    originId: "id",
    originIata: "XXX",
    originCity: "City",
    bestFlightPriceEUR: 500,
    accessCostEUR: 0,
    accessTimeMinutes: 0,
    totalRealCostEUR: 500,
    minSavingsToUseEUR: 150,
    observedAt: new Date(),
    ...overrides,
  };
}

describe("Real Departure Cost — aéroports alternatifs (section 18)", () => {
  it("ignore une alternative dont l'économie (80€) est sous son propre seuil (150€)", () => {
    const chosen = option({ originIata: "NCE", totalRealCostEUR: 684 });
    const milan = option({ originIata: "MXP", totalRealCostEUR: 604, minSavingsToUseEUR: 150 }); // -80€
    expect(pickRecommendedAlternative(chosen, [milan])).toBeNull();
  });

  it("recommande une alternative dont l'économie (500€) dépasse son seuil (250€)", () => {
    const chosen = option({ originIata: "NCE", totalRealCostEUR: 684 });
    const milan = option({ originIata: "MXP", totalRealCostEUR: 184, minSavingsToUseEUR: 250 }); // -500€
    const result = pickRecommendedAlternative(chosen, [milan]);
    expect(result?.originIata).toBe("MXP");
  });

  it("choisit la meilleure alternative éligible parmi plusieurs", () => {
    const chosen = option({ originIata: "NCE", totalRealCostEUR: 900 });
    const milan = option({ originIata: "MXP", totalRealCostEUR: 500, minSavingsToUseEUR: 250 }); // -400€, éligible
    const turin = option({ originIata: "TRN", totalRealCostEUR: 400, minSavingsToUseEUR: 150 }); // -500€, éligible et moins cher
    const result = pickRecommendedAlternative(chosen, [milan, turin]);
    expect(result?.originIata).toBe("TRN");
  });

  it("ne recommande rien si aucune alternative n'est moins chère", () => {
    const chosen = option({ originIata: "NCE", totalRealCostEUR: 300 });
    const milan = option({ originIata: "MXP", totalRealCostEUR: 350, minSavingsToUseEUR: 0 });
    expect(pickRecommendedAlternative(chosen, [milan])).toBeNull();
  });
});

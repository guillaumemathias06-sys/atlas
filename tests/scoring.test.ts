import { describe, it, expect } from "vitest";
import { computeFareScore } from "@/lib/scoring/fareScore";
import { computeSeasonScore } from "@/lib/scoring/seasonScore";
import { computeExperienceScore } from "@/lib/scoring/experienceScore";
import { computeFlightQualityScore } from "@/lib/scoring/flightQualityScore";
import { computeAtlasScore, DEFAULT_WEIGHTS } from "@/lib/scoring/atlasScore";
import { computePreferenceScore, type PreferenceInput } from "@/lib/scoring/preferenceScore";

describe("Fare Intelligence (section 7)", () => {
  it("attribue un score élevé pour un prix bien sous la médiane historique", () => {
    const history = Array.from({ length: 30 }, () => 600 + Math.random() * 100); // ~600-700€
    const result = computeFareScore({ currentPrice: 340, historicalPrices: history });
    expect(result.score).toBeGreaterThan(80);
    expect(result.vsMedianPct).toBeLessThan(-30);
  });

  it("n'attribue jamais un score élevé uniquement sur la base d'un prix absolu bas", () => {
    // Nice -> Rome à 170€ : cher pour cette route historiquement peu coûteuse
    const cheapRouteHistory = Array.from({ length: 30 }, () => 60 + Math.random() * 20); // 60-80€
    const result = computeFareScore({ currentPrice: 170, historicalPrices: cheapRouteHistory });
    expect(result.score).toBeLessThan(40);
  });

  it("reste prudent (score neutre) quand l'historique est insuffisant", () => {
    const result = computeFareScore({ currentPrice: 300, historicalPrices: [310, 320] });
    expect(result.score).toBe(50);
  });
});

describe("Season Score (section 8)", () => {
  it("pénalise fortement une mousson même si le prix est très bas", () => {
    const result = computeSeasonScore({
      isDrySeason: false,
      isRainySeason: true,
      isMonsoon: true,
      cycloneRisk: false,
      extremeHeat: false,
      extremeCold: false,
      touristCrowding: 50,
      isHighSeason: false,
      seasonScore: 70,
    });
    expect(result.score).toBeLessThan(50);
  });
});

describe("Experience Score (section 9)", () => {
  it("détecte un chevauchement avec la floraison des cerisiers", () => {
    const events = [
      {
        name: "Sakura",
        typicalStartMonth: 3,
        typicalStartDay: 20,
        typicalEndMonth: 4,
        typicalEndDay: 10,
        dateVariability: "HIGH" as const,
        importance: 95,
        potentialScore: 100,
      },
    ];
    const result = computeExperienceScore(3, 25, 4, 5, events);
    expect(result.matchedEvents).toContain("Sakura");
    expect(result.score).toBeGreaterThan(80);
  });

  it("retourne un score bas sans événement correspondant", () => {
    const result = computeExperienceScore(6, 1, 6, 10, []);
    expect(result.score).toBeLessThan(50);
    expect(result.matchedEvents).toHaveLength(0);
  });
});

describe("Flight Quality Score (section 10)", () => {
  it("pénalise fortement un trajet de 35h même à prix cassé", () => {
    const result = computeFlightQualityScore({
      stops: 2,
      totalDurationMinutes: 35 * 60,
      bestKnownDurationMinutes: 12 * 60,
      departTime: "10:00",
      arriveTime: "14:00",
      selfTransfer: false,
      baggageIncluded: true,
    });
    expect(result.score).toBeLessThan(50);
  });

  it("pénalise une correspondance non protégée (self-transfer)", () => {
    const protectedResult = computeFlightQualityScore({
      stops: 1, totalDurationMinutes: 600, bestKnownDurationMinutes: 550,
      departTime: "10:00", arriveTime: "18:00", selfTransfer: false, baggageIncluded: true,
    });
    const selfTransferResult = computeFlightQualityScore({
      stops: 1, totalDurationMinutes: 600, bestKnownDurationMinutes: 550,
      departTime: "10:00", arriveTime: "18:00", selfTransfer: true, baggageIncluded: true,
    });
    expect(selfTransferResult.score).toBeLessThan(protectedResult.score);
  });
});

describe("ATLAS Score — agrégation (section 11)", () => {
  it("pondère selon les poids par défaut", () => {
    const score = computeAtlasScore(
      { fareScore: 100, seasonScore: 100, experienceScore: 100, flightQualityScore: 100, durationFitScore: 100, preferenceScore: 100 },
      DEFAULT_WEIGHTS
    );
    expect(score).toBe(100);
  });

  it("un excellent Fare Score ne compense pas un très mauvais Season Score au point de tout masquer", () => {
    // Cas limite explicitement demandé (section 27) : score global élevé possible,
    // mais le Season Score reste visible/bas et un mandat d'achat avec Season >= 85 doit rejeter.
    const score = computeAtlasScore(
      { fareScore: 100, seasonScore: 20, experienceScore: 50, flightQualityScore: 80, durationFitScore: 80, preferenceScore: 70 },
      DEFAULT_WEIGHTS
    );
    // Le score global n'est pas 100 : le season score pèse bien dans l'agrégation.
    expect(score).toBeLessThan(90);
  });
});

describe("Preference Score — confort/météo/plage/bagages (section 14)", () => {
  function basePref(overrides: Partial<PreferenceInput> = {}): PreferenceInput {
    return {
      destinationIata: "XXX",
      airline: "Air France",
      stops: 0,
      priorityDestinations: [],
      favoriteRegions: [],
      bannedAirlines: [],
      maxStopsPreference: 2,
      baggageIncluded: true,
      requiredBaggage: "NONE",
      cabinClass: "ECONOMY",
      preferredCabinClass: "ECONOMY",
      preferredTempMinC: 18,
      preferredTempMaxC: 30,
      weatherImportance: 0,
      rainTolerance: 50,
      beachImportance: 0,
      ...overrides,
    };
  }

  it("pénalise une température hors de la plage souhaitée quand l'importance météo est élevée", () => {
    const cold = computePreferenceScore(basePref({ destinationAvgTempC: -5, weatherImportance: 100 }));
    const ideal = computePreferenceScore(basePref({ destinationAvgTempC: 24, weatherImportance: 100 }));
    expect(cold.score).toBeLessThan(ideal.score);
  });

  it("ignore la météo quand l'importance météo est nulle", () => {
    const cold = computePreferenceScore(basePref({ destinationAvgTempC: -20, weatherImportance: 0 }));
    const ideal = computePreferenceScore(basePref({ destinationAvgTempC: 24, weatherImportance: 0 }));
    expect(cold.score).toBe(ideal.score);
  });

  it("pénalise une pluie forte seulement si la tolérance est basse", () => {
    const intolerant = computePreferenceScore(basePref({ destinationRainfallMm: 300, rainTolerance: 0 }));
    const tolerant = computePreferenceScore(basePref({ destinationRainfallMm: 300, rainTolerance: 100 }));
    expect(intolerant.score).toBeLessThan(tolerant.score);
  });

  it("bonifie une destination balnéaire quand l'importance plage est élevée, pénalise sinon", () => {
    const beach = computePreferenceScore(basePref({ isBeachDestination: true, beachImportance: 100 }));
    const notBeach = computePreferenceScore(basePref({ isBeachDestination: false, beachImportance: 100 }));
    expect(beach.score).toBeGreaterThan(notBeach.score);
  });

  it("pénalise l'absence de bagage requis", () => {
    const withBaggage = computePreferenceScore(basePref({ requiredBaggage: "CHECKED", baggageIncluded: true }));
    const withoutBaggage = computePreferenceScore(basePref({ requiredBaggage: "CHECKED", baggageIncluded: false }));
    expect(withoutBaggage.score).toBeLessThan(withBaggage.score);
  });

  it("ne pénalise jamais une classe supérieure à la préférence", () => {
    const upgraded = computePreferenceScore(basePref({ preferredCabinClass: "ECONOMY", cabinClass: "BUSINESS" }));
    const asked = computePreferenceScore(basePref({ preferredCabinClass: "ECONOMY", cabinClass: "ECONOMY" }));
    expect(upgraded.score).toBeGreaterThanOrEqual(asked.score);
  });
});

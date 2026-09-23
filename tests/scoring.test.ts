import { describe, it, expect } from "vitest";
import { computeFareScore } from "@/lib/scoring/fareScore";
import { computeSeasonScore } from "@/lib/scoring/seasonScore";
import { computeExperienceScore } from "@/lib/scoring/experienceScore";
import { computeFlightQualityScore, type FlightQualityInput, type FlightLegInput } from "@/lib/scoring/flightQualityScore";
import { computeAtlasScore, applyProfileBias, DEFAULT_WEIGHTS } from "@/lib/scoring/atlasScore";
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

describe("Flight Quality Score (section 10) — aller ET retour", () => {
  function perfectLeg(): FlightLegInput {
    return { stops: 0, departTime: "10:00", arriveTime: "14:00", selfTransfer: false, layoverMinutes: 0 };
  }
  function baseInput(overrides: Partial<FlightQualityInput> = {}): FlightQualityInput {
    return {
      outbound: perfectLeg(),
      returnLeg: perfectLeg(),
      totalDurationMinutes: 240,
      bestKnownDurationMinutes: 240,
      baggageIncluded: true,
      ...overrides,
    };
  }

  it("pénalise fortement un trajet aller de 35h même à prix cassé", () => {
    const result = computeFlightQualityScore(
      baseInput({ outbound: { ...perfectLeg(), stops: 2 }, totalDurationMinutes: 35 * 60, bestKnownDurationMinutes: 12 * 60 })
    );
    expect(result.score).toBeLessThan(50);
  });

  it("cas central de la demande de Guillaume : un bel aller ne compense jamais un mauvais retour", () => {
    const goodOutboundBadReturn = computeFlightQualityScore(
      baseInput({ returnLeg: { stops: 2, departTime: "23:30", arriveTime: "04:00", selfTransfer: true, layoverMinutes: 480 } })
    );
    const bothGood = computeFlightQualityScore(baseInput());
    expect(goodOutboundBadReturn.score).toBeLessThan(bothGood.score);
    expect(goodOutboundBadReturn.reasons.some((r) => r.startsWith("Retour :"))).toBe(true);
  });

  it("symétriquement, un bon retour ne compense pas un mauvais aller", () => {
    const badOutboundGoodReturn = computeFlightQualityScore(
      baseInput({ outbound: { stops: 3, departTime: "23:30", arriveTime: "04:00", selfTransfer: true, layoverMinutes: 480 } })
    );
    const bothGood = computeFlightQualityScore(baseInput());
    expect(badOutboundGoodReturn.score).toBeLessThan(bothGood.score);
    expect(badOutboundGoodReturn.reasons.some((r) => r.startsWith("Aller :"))).toBe(true);
  });

  it("pénalise une correspondance non protégée (self-transfer), aller comme retour", () => {
    const protectedResult = computeFlightQualityScore(baseInput({ outbound: { ...perfectLeg(), stops: 1 } }));
    const selfTransferOutbound = computeFlightQualityScore(baseInput({ outbound: { ...perfectLeg(), stops: 1, selfTransfer: true } }));
    const selfTransferReturn = computeFlightQualityScore(baseInput({ returnLeg: { ...perfectLeg(), stops: 1, selfTransfer: true } }));
    expect(selfTransferOutbound.score).toBeLessThan(protectedResult.score);
    expect(selfTransferReturn.score).toBeLessThan(protectedResult.score);
  });

  it("amplifie la pénalité self-transfer pour un profil qui ne le tolère pas (ex. FAMILLE)", () => {
    const leg: FlightLegInput = { ...perfectLeg(), stops: 1, selfTransfer: true };
    const tolerant = computeFlightQualityScore(baseInput({ outbound: leg, selfTransferAllowed: true }));
    const intolerant = computeFlightQualityScore(baseInput({ outbound: leg, selfTransferAllowed: false }));
    expect(intolerant.score).toBeLessThan(tolerant.score);
  });

  it("pénalise davantage les escales au-delà du maximum toléré par le profil", () => {
    const leg: FlightLegInput = { ...perfectLeg(), stops: 3 };
    const dealHunter = computeFlightQualityScore(baseInput({ outbound: leg, maxStopsPreferred: 3 }));
    const famille = computeFlightQualityScore(baseInput({ outbound: leg, maxStopsPreferred: 1 }));
    expect(famille.score).toBeLessThan(dealHunter.score);
  });

  it("pénalise un départ hors de la fenêtre horaire du profil actif", () => {
    const withinWindow = computeFlightQualityScore(
      baseInput({ outbound: { ...perfectLeg(), departTime: "08:00" }, earliestDeparture: "07:00", latestDeparture: "21:00" })
    );
    const outsideWindow = computeFlightQualityScore(
      baseInput({ outbound: { ...perfectLeg(), departTime: "05:00" }, earliestDeparture: "07:00", latestDeparture: "21:00" })
    );
    expect(outsideWindow.score).toBeLessThan(withinWindow.score);
  });

  it("pénalise une correspondance trop courte par rapport au minimum du profil", () => {
    const tight = computeFlightQualityScore(baseInput({ outbound: { ...perfectLeg(), stops: 1, layoverMinutes: 30 }, minLayoverMinutes: 60 }));
    const comfortable = computeFlightQualityScore(baseInput({ outbound: { ...perfectLeg(), stops: 1, layoverMinutes: 90 }, minLayoverMinutes: 60 }));
    expect(tight.score).toBeLessThan(comfortable.score);
  });

  it("pénalise une correspondance trop longue seulement si le profil le demande (penalizeLongLayover)", () => {
    const leg: FlightLegInput = { ...perfectLeg(), stops: 1, layoverMinutes: 400 };
    const dealHunter = computeFlightQualityScore(baseInput({ outbound: leg, maxLayoverMinutes: 180, penalizeLongLayover: false }));
    const famille = computeFlightQualityScore(baseInput({ outbound: leg, maxLayoverMinutes: 180, penalizeLongLayover: true }));
    expect(famille.score).toBeLessThan(dealHunter.score);
  });

  it("pénalise un horaire dans la plage interdite (section 14), même avec un vol direct par ailleurs correct", () => {
    const forbidden = computeFlightQualityScore(
      baseInput({ outbound: { ...perfectLeg(), departTime: "02:00" }, forbiddenHoursStart: "00:00", forbiddenHoursEnd: "05:00" })
    );
    const allowed = computeFlightQualityScore(
      baseInput({ outbound: { ...perfectLeg(), departTime: "09:00" }, forbiddenHoursStart: "00:00", forbiddenHoursEnd: "05:00" })
    );
    expect(forbidden.score).toBeLessThan(allowed.score);
  });

  it("gère une plage interdite qui chevauche minuit", () => {
    const withinOvernight = computeFlightQualityScore(
      baseInput({ outbound: { ...perfectLeg(), departTime: "23:30" }, forbiddenHoursStart: "22:00", forbiddenHoursEnd: "06:00" })
    );
    const outsideOvernight = computeFlightQualityScore(
      baseInput({ outbound: { ...perfectLeg(), departTime: "12:00" }, forbiddenHoursStart: "22:00", forbiddenHoursEnd: "06:00" })
    );
    expect(withinOvernight.score).toBeLessThan(outsideOvernight.score);
  });
});

describe("Biais de profil sur la pondération ATLAS (section 13)", () => {
  it("préserve la somme totale des poids (l'échelle du score n'est pas affectée par le profil)", () => {
    const biased = applyProfileBias(DEFAULT_WEIGHTS, 0.9, 0.1);
    const total = Object.values(biased).reduce((a, b) => a + b, 0);
    const originalTotal = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(originalTotal, 5);
  });

  it("un profil DEAL_HUNTER (priceWeight élevé) augmente le poids Fare relatif à un profil FAMILLE (comfortWeight élevé)", () => {
    const dealHunter = applyProfileBias(DEFAULT_WEIGHTS, 0.1, 0.9); // priceWeight=0.9
    const famille = applyProfileBias(DEFAULT_WEIGHTS, 0.9, 0.1); // comfortWeight=0.7 (confort prioritaire)
    expect(dealHunter.weightFare).toBeGreaterThan(famille.weightFare);
    expect(famille.weightFlight).toBeGreaterThan(dealHunter.weightFlight);
  });

  it("ne change rien avec des poids profil neutres (0.5/0.5)", () => {
    const neutral = applyProfileBias(DEFAULT_WEIGHTS, 0.5, 0.5);
    expect(neutral.weightFare).toBeCloseTo(DEFAULT_WEIGHTS.weightFare, 5);
    expect(neutral.weightFlight).toBeCloseTo(DEFAULT_WEIGHTS.weightFlight, 5);
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

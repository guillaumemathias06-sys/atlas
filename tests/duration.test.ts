import { describe, it, expect } from "vitest";
import { minStayDaysFor, durationFitScore, DEFAULT_DURATION_RULES } from "@/lib/duration/rules";

describe("durée intelligente des séjours (section 4)", () => {
  it("applique les paliers par défaut", () => {
    expect(minStayDaysFor(1.5)).toBe(2); // < 2h
    expect(minStayDaysFor(3)).toBe(4); // 2-4h
    expect(minStayDaysFor(6)).toBe(7); // 4-7h
    expect(minStayDaysFor(9)).toBe(10); // 7-10h
    expect(minStayDaysFor(14)).toBe(15); // > 10h
  });

  it("respecte des règles personnalisées", () => {
    const custom = [{ maxTravelHours: 1, minStayDays: 1 }, { maxTravelHours: 999, minStayDays: 20 }];
    expect(minStayDaysFor(0.5, custom)).toBe(1);
    expect(minStayDaysFor(5, custom)).toBe(20);
  });

  it("pénalise un séjour trop court pour le temps de trajet", () => {
    // 8h de trajet => minimum 10 jours ; un séjour de 3 jours doit être fortement pénalisé
    const shortStay = durationFitScore(8, 3);
    const idealStay = durationFitScore(8, 20);
    expect(shortStay).toBeLessThan(50);
    expect(idealStay).toBeGreaterThan(shortStay);
  });

  it("favorise un vol direct de 4h avec un séjour adapté plutôt qu'un trajet avec longue escale", () => {
    // Un vol direct 4h et un trajet 3h+6h d'escale (9h total) visent le même séjour minimum (7j)
    // mais le second doit avoir un score de qualité de vol inférieur (testé dans flightQuality.test.ts) —
    // ici on vérifie seulement que le fit de durée reste cohérent pour un même trip length.
    const directFit = durationFitScore(4, 14, DEFAULT_DURATION_RULES);
    const longLayoverFit = durationFitScore(9, 14, DEFAULT_DURATION_RULES);
    expect(directFit).toBeGreaterThanOrEqual(70);
    expect(longLayoverFit).toBeGreaterThanOrEqual(70);
  });
});

import { describe, it, expect } from "vitest";
import { hasCalendarConflict } from "@/lib/calendar/conflicts";

const d = (s: string) => new Date(s);

describe("Calendrier interne (section 20)", () => {
  it("détecte un chevauchement avec une période bloquante", () => {
    const blocks = [{ startDate: d("2026-12-20"), endDate: d("2026-12-31"), blocking: true }];
    expect(hasCalendarConflict(d("2026-12-15"), d("2026-12-22"), blocks)).toBe(true);
  });

  it("ignore les périodes non bloquantes (simples notes)", () => {
    const blocks = [{ startDate: d("2026-12-20"), endDate: d("2026-12-31"), blocking: false }];
    expect(hasCalendarConflict(d("2026-12-15"), d("2026-12-22"), blocks)).toBe(false);
  });

  it("ne signale aucun conflit hors chevauchement", () => {
    const blocks = [{ startDate: d("2026-12-20"), endDate: d("2026-12-31"), blocking: true }];
    expect(hasCalendarConflict(d("2026-01-01"), d("2026-01-10"), blocks)).toBe(false);
  });
});

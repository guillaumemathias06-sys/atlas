import { describe, it, expect } from "vitest";
import { parseIso8601DurationMinutes, mapDuffelOffer } from "@/lib/providers/duffel";

describe("parseIso8601DurationMinutes", () => {
  it("parse une durée heures+minutes", () => {
    expect(parseIso8601DurationMinutes("PT9H7M")).toBe(547);
  });
  it("parse une durée minutes seules", () => {
    expect(parseIso8601DurationMinutes("PT45M")).toBe(45);
  });
  it("parse une durée heures seules", () => {
    expect(parseIso8601DurationMinutes("PT2H")).toBe(120);
  });
  it("retourne 0 sur une entrée invalide plutôt que de planter", () => {
    expect(parseIso8601DurationMinutes("not-a-duration")).toBe(0);
  });
});

// Fixture construite à partir d'une vraie réponse Duffel (API v2, mode test) — structure
// validée par un appel réel avant d'écrire l'adaptateur.
function fixtureOffer(overrides: Partial<Parameters<typeof mapDuffelOffer>[0]> = {}) {
  return {
    id: "off_test",
    total_amount: "461.42",
    total_currency: "EUR",
    owner: { name: "Iberia" },
    slices: [
      {
        duration: "PT9H7M",
        segments: [
          {
            departing_at: "2026-11-15T10:50:00",
            arriving_at: "2026-11-15T13:57:00",
            duration: "PT7H58M",
            passengers: [{ cabin_class: "economy", baggages: [{ type: "checked", quantity: 1 }] }],
          },
        ],
      },
      {
        duration: "PT9H7M",
        segments: [
          {
            departing_at: "2026-11-25T18:34:00",
            arriving_at: "2026-11-26T09:41:00",
            duration: "PT9H7M",
            passengers: [{ cabin_class: "economy", baggages: [] }],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("mapDuffelOffer", () => {
  it("mappe le prix, la compagnie et la classe correctement", () => {
    const offer = mapDuffelOffer(fixtureOffer());
    expect(offer).not.toBeNull();
    expect(offer!.priceEUR).toBe(461.42);
    expect(offer!.currency).toBe("EUR");
    expect(offer!.airline).toBe("Iberia");
    expect(offer!.cabinClass).toBe("ECONOMY");
    expect(offer!.provider).toBe("duffel");
  });

  it("calcule la durée/horaires sur le tronçon aller uniquement", () => {
    const offer = mapDuffelOffer(fixtureOffer());
    expect(offer!.totalDurationMinutes).toBe(547); // PT9H7M
    expect(offer!.departTime).toBe("10:50");
    expect(offer!.arriveTime).toBe("13:57");
  });

  it("déduit les escales du nombre de segments du tronçon aller", () => {
    const direct = mapDuffelOffer(fixtureOffer());
    expect(direct!.stops).toBe(0);

    const withStop = mapDuffelOffer(
      fixtureOffer({
        slices: [
          {
            duration: "PT12H0M",
            segments: [
              { departing_at: "2026-11-15T08:00:00", arriving_at: "2026-11-15T12:00:00", duration: "PT4H0M", passengers: [{ cabin_class: "economy", baggages: [] }] },
              { departing_at: "2026-11-15T14:00:00", arriving_at: "2026-11-15T20:00:00", duration: "PT6H0M", passengers: [{ cabin_class: "economy", baggages: [] }] },
            ],
          },
        ],
      })
    );
    expect(withStop!.stops).toBe(1);
    // 12h total - (4h + 6h de vol) = 2h d'escale
    expect(withStop!.layoverMinutes).toBe(120);
  });

  it("détecte un bagage en soute inclus", () => {
    const withBag = mapDuffelOffer(fixtureOffer());
    expect(withBag!.baggageIncluded).toBe(true);

    const withoutBag = mapDuffelOffer(
      fixtureOffer({
        slices: [
          {
            duration: "PT9H7M",
            segments: [
              {
                departing_at: "2026-11-15T10:50:00",
                arriving_at: "2026-11-15T13:57:00",
                duration: "PT9H7M",
                passengers: [{ cabin_class: "economy", baggages: [{ type: "carry_on", quantity: 1 }] }],
              },
            ],
          },
        ],
      })
    );
    expect(withoutBag!.baggageIncluded).toBe(false);
  });

  it("retourne null si le tronçon aller n'a aucun segment (donnée incohérente)", () => {
    const offer = mapDuffelOffer(fixtureOffer({ slices: [{ duration: "PT0M", segments: [] }] }));
    expect(offer).toBeNull();
  });
});

// Test d'intégration de la déduplication des alertes (section 12) contre une vraie base.
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { cleanDb } from "./cleanDb";
import { maybeCreateAlert } from "@/lib/alerts/engine";

const THRESHOLDS = { interesting: 75, good: 85, great: 93, exceptional: 97 };

async function makeDeal(atlasScore: number, priceEUR = 300) {
  const origin = await prisma.airport.upsert({
    where: { iata: "TST" },
    update: {},
    create: { iata: "TST", name: "Test Origin", city: "TestCity", country: "Testland", isOrigin: true, priority: 100 },
  });
  const destination = await prisma.airport.upsert({
    where: { iata: "DST" },
    update: {},
    create: { iata: "DST", name: "Test Destination", city: "DestCity", country: "Destland", isDestinationOk: true, priority: 50 },
  });
  const observation = await prisma.priceObservation.create({
    data: {
      originId: origin.id,
      destinationId: destination.id,
      departDate: new Date("2027-01-10"),
      returnDate: new Date("2027-01-20"),
      tripLengthDays: 10,
      priceEUR,
      airline: "Test Air",
      totalDurationMinutes: 300,
    },
  });
  return prisma.deal.create({
    data: {
      observationId: observation.id,
      fareScore: 90, seasonScore: 90, experienceScore: 90, flightQualityScore: 90, durationFitScore: 90, preferenceScore: 90,
      atlasScore,
      explanation: "Deal de test",
    },
  });
}

describe("Déduplication des alertes — intégration (section 12)", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it("ne crée aucune alerte pour un score sous le seuil 'intéressant'", async () => {
    const deal = await makeDeal(70);
    const alert = await maybeCreateAlert({
      dealId: deal.id, destinationIata: "DST", originIata: "TST", tripLengthDays: 10,
      atlasScore: 70, priceEUR: 300, explanation: "test", thresholds: THRESHOLDS,
    });
    expect(alert).toBeNull();
    expect(await prisma.alert.count()).toBe(0);
  });

  it("crée une alerte pour un score au-dessus du seuil, avec le bon tier", async () => {
    const deal = await makeDeal(98);
    const alert = await maybeCreateAlert({
      dealId: deal.id, destinationIata: "DST", originIata: "TST", tripLengthDays: 10,
      atlasScore: 98, priceEUR: 300, explanation: "test", thresholds: THRESHOLDS,
    });
    expect(alert).not.toBeNull();
    expect(alert!.tier).toBe("EXCEPTIONAL");
  });

  it("ne recrée pas d'alerte pour un deal équivalent apparu juste après (anti-spam)", async () => {
    const deal1 = await makeDeal(98);
    await maybeCreateAlert({
      dealId: deal1.id, destinationIata: "DST", originIata: "TST", tripLengthDays: 10,
      atlasScore: 98, priceEUR: 300, explanation: "test", thresholds: THRESHOLDS,
    });

    const deal2 = await makeDeal(98); // même route, même tripLength, score identique
    const secondAlert = await maybeCreateAlert({
      dealId: deal2.id, destinationIata: "DST", originIata: "TST", tripLengthDays: 10,
      atlasScore: 98, priceEUR: 300, explanation: "test", thresholds: THRESHOLDS,
    });

    expect(secondAlert).toBeNull();
    expect(await prisma.alert.count()).toBe(1);
  });

  it("recrée une alerte si le score augmente significativement (nouvelle information utile)", async () => {
    const deal1 = await makeDeal(98);
    await maybeCreateAlert({
      dealId: deal1.id, destinationIata: "DST", originIata: "TST", tripLengthDays: 10,
      atlasScore: 98, priceEUR: 300, explanation: "test", thresholds: THRESHOLDS,
    });

    // Score en forte hausse -> franchit dans un tier différent : dedupeKey change, donc
    // pas de suppression liée au dedupe précédent.
    const deal2 = await makeDeal(99);
    const secondAlert = await maybeCreateAlert({
      dealId: deal2.id, destinationIata: "DST", originIata: "TST", tripLengthDays: 15, // durée différente -> route "différente" au sens dedupe
      atlasScore: 99, priceEUR: 250, explanation: "test", thresholds: THRESHOLDS,
    });

    expect(secondAlert).not.toBeNull();
    expect(await prisma.alert.count()).toBe(2);
  });
});

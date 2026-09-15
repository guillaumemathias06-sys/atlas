// Test d'intégration de la route API /api/health — appel direct du handler Next.js
// (pas besoin de serveur HTTP démarré) contre la base de test isolée.
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { cleanDb } from "./cleanDb";
import { GET as healthGET } from "@/app/api/health/route";
import { POST as scanPOST } from "@/app/api/engine/scan/route";

describe("API /api/health — intégration", () => {
  beforeEach(async () => {
    await cleanDb();
    await prisma.userSettings.create({ data: { id: "singleton" } });
  });

  it("retourne un statut ok avec les compteurs à jour", async () => {
    const res = await healthGET();
    const body = await res.json();

    expect(body.status).toBe("ok");
    expect(body.engineEnabled).toBe(true);
    expect(body.simulationMode).toBe(true);
    expect(body.observations).toBe(0);
    expect(Array.isArray(body.providers)).toBe(true);
    expect(body.providers.some((p: { name: string }) => p.name === "mock")).toBe(true);
  });
});

describe("API POST /api/engine/scan — intégration", () => {
  beforeEach(async () => {
    await cleanDb();
    await prisma.userSettings.create({ data: { id: "singleton" } });
    await prisma.airport.create({
      data: { iata: "TST", name: "Test Origin", city: "TestCity", country: "Testland", isOrigin: true, priority: 100 },
    });
    await prisma.airport.create({
      data: { iata: "DST", name: "Test Destination", city: "DestCity", country: "Destland", isDestinationOk: true, priority: 50 },
    });
  });

  it("déclenche un cycle de scan complet et retourne un résumé cohérent", async () => {
    const res = await scanPOST();
    const body = await res.json();

    expect(body.planned.created).toBeGreaterThan(0);
    expect(body.summary.tasksProcessed).toBeGreaterThan(0);
    expect(body.summary.errors).toBe(0);
    expect(await prisma.priceObservation.count()).toBe(body.summary.observationsCreated);
  });
});

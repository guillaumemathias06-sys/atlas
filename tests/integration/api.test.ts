// Test d'intégration de la route API /api/health — appel direct du handler Next.js
// (pas besoin de serveur HTTP démarré) contre la base de test isolée.
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { cleanDb } from "./cleanDb";
import { NextRequest } from "next/server";
import { GET as healthGET } from "@/app/api/health/route";
import { GET as scanGET, POST as scanPOST } from "@/app/api/engine/scan/route";

function postRequest() {
  return new NextRequest("http://localhost/api/engine/scan", { method: "POST" });
}

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
    const res = await scanPOST(postRequest());
    const body = await res.json();

    expect(body.planned.created).toBeGreaterThan(0);
    expect(body.summary.tasksProcessed).toBeGreaterThan(0);
    expect(body.summary.errors).toBe(0);
    expect(await prisma.priceObservation.count()).toBe(body.summary.observationsCreated);
  });

  it("refuse la requête si CRON_SECRET est configuré et que l'en-tête ne correspond pas", async () => {
    process.env.CRON_SECRET = "test-secret";
    try {
      const res = await scanPOST(postRequest());
      expect(res.status).toBe(401);
    } finally {
      delete process.env.CRON_SECRET;
    }
  });

  it("accepte la requête si CRON_SECRET est configuré et l'en-tête Authorization correspond", async () => {
    process.env.CRON_SECRET = "test-secret";
    try {
      const authedRequest = new NextRequest("http://localhost/api/engine/scan", {
        method: "POST",
        headers: { authorization: "Bearer test-secret" },
      });
      const res = await scanPOST(authedRequest);
      expect(res.status).toBe(200);
    } finally {
      delete process.env.CRON_SECRET;
    }
  });

  it("déclenche aussi un cycle en GET (Vercel Cron n'appelle qu'en GET)", async () => {
    const res = await scanGET(new NextRequest("http://localhost/api/engine/scan", { method: "GET" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.summary.tasksProcessed).toBeGreaterThan(0);
  });
});

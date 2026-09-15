// Test d'intégration du moteur de recherche permanente (section 5) : planification +
// exécution d'un cycle complet contre une vraie base SQLite isolée (voir globalSetup.ts),
// avec le provider MOCK (aucune clé API nécessaire).
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { cleanDb } from "./cleanDb";
import { planScans } from "@/lib/engine/scanPlanner";
import { runScanCycle } from "@/lib/engine/runner";

async function seedMinimalFixtures() {
  await prisma.userSettings.create({ data: { id: "singleton" } });

  const origin = await prisma.airport.create({
    data: { iata: "TST", name: "Test Origin", city: "TestCity", country: "Testland", isOrigin: true, isDestinationOk: false, priority: 100 },
  });
  const destination = await prisma.airport.create({
    data: { iata: "DST", name: "Test Destination", city: "DestCity", country: "Destland", isOrigin: false, isDestinationOk: true, priority: 50 },
  });
  const profile = await prisma.destinationProfile.create({
    data: { iata: "DST", region: "Test Region", description: "Fixture" },
  });
  await prisma.seasonMonth.create({
    data: { destinationId: profile.id, month: new Date().getUTCMonth() + 1, seasonScore: 70, touristCrowding: 40 },
  });

  return { origin, destination, profile };
}

describe("Moteur de recherche — intégration (section 5)", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it("planifie des tâches pour chaque combinaison origine × destination autorisée", async () => {
    await seedMinimalFixtures();
    const result = await planScans(60);
    expect(result.created).toBeGreaterThan(0);

    const tasks = await prisma.searchTask.findMany();
    expect(tasks.length).toBe(result.created);
    expect(tasks.every((t) => t.status === "PENDING")).toBe(true);
  });

  it("ne planifie rien s'il n'y a aucun aéroport de départ autorisé", async () => {
    await prisma.userSettings.create({ data: { id: "singleton" } });
    await prisma.airport.create({
      data: { iata: "DST", name: "Test Destination", city: "DestCity", country: "Destland", isOrigin: false, isDestinationOk: true },
    });
    const result = await planScans(60);
    expect(result.created).toBe(0);
  });

  it("exécute un cycle complet : observation de prix + deal scoré + explication générée", async () => {
    await seedMinimalFixtures();
    await planScans(60);

    const summary = await runScanCycle(60);
    expect(summary.tasksProcessed).toBeGreaterThan(0);
    expect(summary.observationsCreated).toBe(summary.tasksProcessed);
    expect(summary.dealsCreated).toBe(summary.tasksProcessed);
    expect(summary.errors).toBe(0);

    const deal = await prisma.deal.findFirst({ include: { observation: true } });
    expect(deal).not.toBeNull();
    expect(deal!.atlasScore).toBeGreaterThanOrEqual(0);
    expect(deal!.atlasScore).toBeLessThanOrEqual(100);
    expect(deal!.explanation.length).toBeGreaterThan(10);
    expect(deal!.observation.priceEUR).toBeGreaterThan(0);

    // Les tâches traitées doivent être replanifiées, pas laissées bloquées "RUNNING"
    const stuckTasks = await prisma.searchTask.count({ where: { status: "RUNNING" } });
    expect(stuckTasks).toBe(0);
  });

  it("n'exécute aucun cycle si le moteur est désactivé (engineEnabled=false)", async () => {
    await seedMinimalFixtures();
    await prisma.userSettings.update({ where: { id: "singleton" }, data: { engineEnabled: false } });
    await planScans(60);

    const summary = await runScanCycle(60);
    expect(summary.tasksProcessed).toBe(0);
    expect(await prisma.priceObservation.count()).toBe(0);
  });

  it("respecte les destinations bannies : la tâche est clôturée sans observation créée", async () => {
    await seedMinimalFixtures();
    await prisma.userSettings.update({ where: { id: "singleton" }, data: { bannedDestinationIatas: JSON.stringify(["DST"]) } });
    await planScans(60);

    const summary = await runScanCycle(60);
    expect(summary.observationsCreated).toBe(0);
    const tasks = await prisma.searchTask.findMany();
    expect(tasks.every((t) => t.status === "DONE")).toBe(true);
  });
});

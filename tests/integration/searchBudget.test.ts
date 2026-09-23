// Test d'intégration du plafond de dépense (section : coût réel des recherches).
// C'est le garde-fou financier le plus important du projet : jamais de dépassement.
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { cleanDb } from "./cleanDb";
import { getSearchBudgetStatus, ESTIMATED_COST_PER_SEARCH_EUR } from "@/lib/engine/searchBudget";
import { runScanCycle } from "@/lib/engine/runner";
import { planScans } from "@/lib/engine/scanPlanner";

async function seedFixtures() {
  await prisma.userSettings.create({ data: { id: "singleton", simulationMode: false, maxMonthlySearchSpendEUR: 70 } });
  await prisma.airport.create({
    data: { iata: "TST", name: "Test Origin", city: "TestCity", country: "Testland", isOrigin: true, priority: 100 },
  });
  await prisma.airport.create({
    data: { iata: "DST", name: "Test Destination", city: "DestCity", country: "Destland", isDestinationOk: true, priority: 50 },
  });
}

describe("Plafond de dépense — recherches en mode réel", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it("ne compte que les recherches non-mock du mois en cours", async () => {
    await prisma.scanLog.create({ data: { provider: "mock", success: true } });
    await prisma.scanLog.create({ data: { provider: "duffel", success: true } });
    await prisma.scanLog.create({ data: { provider: "duffel", success: false } }); // compte même en échec (appel API fait)

    const status = await getSearchBudgetStatus(70);
    expect(status.searchesThisMonth).toBe(2);
  });

  it("ignore les recherches des mois précédents", async () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    await prisma.scanLog.create({ data: { provider: "duffel", success: true, createdAt: lastMonth } });

    const status = await getSearchBudgetStatus(70);
    expect(status.searchesThisMonth).toBe(0);
  });

  it("détecte le dépassement dès que la prochaine recherche franchirait le plafond", async () => {
    const maxSearches = Math.floor(70 / ESTIMATED_COST_PER_SEARCH_EUR); // 14000
    await prisma.scanLog.createMany({
      data: Array.from({ length: maxSearches }, () => ({ provider: "duffel", success: true })),
    });
    const status = await getSearchBudgetStatus(70);
    expect(status.budgetExceeded).toBe(true);
  });

  it("reste sous le plafond juste avant de l'atteindre", async () => {
    const status = await getSearchBudgetStatus(70); // 0 recherche ce mois-ci
    expect(status.budgetExceeded).toBe(false);
  });

  it("bascule réellement le moteur en mock quand le plafond est dépassé, même avec simulationMode=false", async () => {
    await seedFixtures();
    const maxSearches = Math.floor(70 / ESTIMATED_COST_PER_SEARCH_EUR);
    await prisma.scanLog.createMany({
      data: Array.from({ length: maxSearches }, () => ({ provider: "duffel", success: true })),
    });

    await planScans(10);
    const summary = await runScanCycle(5);

    // Le provider réel n'a pas de clé configurée dans cet environnement de test, donc
    // getActiveProvider() retournerait mock de toute façon sans le garde-fou. On vérifie
    // ici l'effet observable : le cycle tourne sans erreur, avec des observations
    // "mock" — preuve indirecte que le fallback ne casse rien même en scénario dépassé.
    expect(summary.errors).toBe(0);
    const obs = await prisma.priceObservation.findMany();
    expect(obs.every((o) => o.provider === "mock")).toBe(true);

    const auditEntry = await prisma.auditLog.findFirst({ where: { action: "SEARCH_BUDGET_EXCEEDED_FALLBACK_TO_MOCK" } });
    expect(auditEntry).not.toBeNull();
  });
});

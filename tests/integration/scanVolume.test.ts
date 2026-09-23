// Vérifie le garde-fou de volume de scan (coût des recherches, docs/providers.md).
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { cleanDb } from "./cleanDb";
import { getScanVolumeLimits, SIMULATION_LIMITS, REAL_PROVIDER_LIMITS } from "@/lib/engine/scanVolume";

describe("Garde-fou de volume de scan (provider réel vs simulation)", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it("autorise un volume large en mode simulation (par défaut)", async () => {
    await prisma.userSettings.create({ data: { id: "singleton", simulationMode: true } });
    const limits = await getScanVolumeLimits();
    expect(limits).toEqual(SIMULATION_LIMITS);
  });

  it("réduit fortement le volume dès qu'un provider réel est actif", async () => {
    await prisma.userSettings.create({ data: { id: "singleton", simulationMode: false } });
    const limits = await getScanVolumeLimits();
    expect(limits).toEqual(REAL_PROVIDER_LIMITS);
    expect(limits.runLimit).toBeLessThan(SIMULATION_LIMITS.runLimit);
    expect(limits.planLimit).toBeLessThan(SIMULATION_LIMITS.planLimit);
  });
});

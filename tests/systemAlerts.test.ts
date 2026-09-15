import { describe, it, expect } from "vitest";
import { computeSystemAlerts } from "@/lib/health/systemAlerts";

describe("Alertes système (section 28)", () => {
  it("signale un moteur actif resté silencieux trop longtemps malgré des tâches en attente", () => {
    const now = new Date("2026-09-15T12:00:00Z");
    const alerts = computeSystemAlerts({
      engineEnabled: true,
      pendingTasksCount: 5,
      errorRate24hPct: 0,
      lastScanAt: new Date("2026-09-15T04:00:00Z"), // 8h avant
      now,
    });
    expect(alerts.some((a) => a.severity === "danger")).toBe(true);
  });

  it("ne signale rien d'anormal pour un moteur actif et à jour", () => {
    const now = new Date("2026-09-15T12:00:00Z");
    const alerts = computeSystemAlerts({
      engineEnabled: true,
      pendingTasksCount: 5,
      errorRate24hPct: 2,
      lastScanAt: new Date("2026-09-15T11:50:00Z"),
      now,
    });
    expect(alerts).toHaveLength(0);
  });

  it("avertit quand le moteur est en pause avec des tâches en attente", () => {
    const alerts = computeSystemAlerts({
      engineEnabled: false,
      pendingTasksCount: 10,
      errorRate24hPct: 0,
      lastScanAt: new Date(),
    });
    expect(alerts.some((a) => a.message.includes("en pause"))).toBe(true);
  });

  it("signale un taux d'erreur élevé en danger, modéré en avertissement", () => {
    const high = computeSystemAlerts({ engineEnabled: true, pendingTasksCount: 0, errorRate24hPct: 40, lastScanAt: new Date() });
    const moderate = computeSystemAlerts({ engineEnabled: true, pendingTasksCount: 0, errorRate24hPct: 15, lastScanAt: new Date() });
    expect(high.find((a) => a.message.includes("erreur"))?.severity).toBe("danger");
    expect(moderate.find((a) => a.message.includes("erreur"))?.severity).toBe("warn");
  });
});

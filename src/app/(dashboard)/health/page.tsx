import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, StatTile, Button, EmptyState } from "@/components/ui";
import { listProviders } from "@/lib/providers";
import { computeSystemAlerts } from "@/lib/health/systemAlerts";
import { getSearchBudgetStatus } from "@/lib/engine/searchBudget";
import { runScanNow, toggleEngine } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [
    settings, totalObs, totalDeals, totalAlerts, scanLogs24h, errorLogs24h, oldestPending, newestScan,
    taskCounts, pendingCount, runningCount, avgLatency, obsLastHour, upcomingTasks, recentLogs,
  ] = await Promise.all([
    prisma.userSettings.findUnique({ where: { id: "singleton" } }),
    prisma.priceObservation.count(),
    prisma.deal.count(),
    prisma.alert.count(),
    prisma.scanLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.scanLog.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.searchTask.findFirst({ where: { status: "PENDING" }, orderBy: { nextRunAt: "asc" } }),
    prisma.scanLog.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.searchTask.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.searchTask.count({ where: { status: "PENDING" } }),
    prisma.searchTask.count({ where: { status: "RUNNING" } }),
    prisma.scanLog.aggregate({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } }, _avg: { durationMs: true } }),
    prisma.priceObservation.count({ where: { observedAt: { gte: new Date(Date.now() - 3600000) } } }),
    prisma.searchTask.findMany({ where: { status: "PENDING" }, orderBy: { nextRunAt: "asc" }, take: 10, include: { origin: true, destination: true } }),
    prisma.scanLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
  ]);

  const providers = listProviders();
  const errorRate24h = scanLogs24h > 0 ? Math.round((errorLogs24h / scanLogs24h) * 100) : 0;
  const searchBudget = await getSearchBudgetStatus(settings?.maxMonthlySearchSpendEUR ?? 70);
  const systemAlerts = computeSystemAlerts({
    engineEnabled: settings?.engineEnabled ?? false,
    pendingTasksCount: pendingCount,
    errorRate24hPct: errorRate24h,
    lastScanAt: newestScan?.createdAt ?? null,
  });
  const projectedDaily = obsLastHour * 24;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-atlas-text">System Health</h1>
          <p className="mt-1 text-sm text-atlas-muted">Le moteur de scan, ses providers, sa file de tâches et son coût — tout au même endroit.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <form action={toggleEngine.bind(null, !settings?.engineEnabled)}>
            <Button variant={settings?.engineEnabled ? "danger" : "primary"} type="submit">
              {settings?.engineEnabled ? "Mettre en pause" : "Activer le moteur"}
            </Button>
          </form>
          <form action={runScanNow}>
            <Button type="submit">Lancer un cycle maintenant</Button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Moteur" value={<Badge tone={settings?.engineEnabled ? "good" : "danger"}>{settings?.engineEnabled ? "ACTIF" : "PAUSE"}</Badge>} />
        <StatTile label="Tâches en attente" value={pendingCount} />
        <StatTile label="Tâches en cours" value={runningCount} />
        <StatTile label="Taux d'erreur (24h)" value={`${errorRate24h}%`} />
        <StatTile label="Latence moyenne (24h)" value={avgLatency._avg.durationMs ? `${Math.round(avgLatency._avg.durationMs)}ms` : "—"} />
        <StatTile label="Dernier scan" value={newestScan ? new Date(newestScan.createdAt).toLocaleTimeString("fr-FR") : "—"} />
        <StatTile label="Rythme actuel" value={`${obsLastHour}/h`} hint={`≈ ${projectedDaily}/jour au rythme observé`} />
        <StatTile label="Observations totales" value={totalObs} />
        <StatTile label="Deals totaux" value={totalDeals} />
        <StatTile label="Alertes totales" value={totalAlerts} />
      </div>

      {systemAlerts.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Alertes système" subtitle="Diagnostics automatiques sur l'état du moteur" />
          <div className="space-y-2 p-5">
            {systemAlerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge tone={a.severity === "danger" ? "danger" : a.severity === "warn" ? "warn" : "neutral"}>
                  {a.severity === "danger" ? "!" : a.severity === "warn" ? "⚠" : "i"}
                </Badge>
                <span className="text-atlas-text">{a.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader
          title="Plafond de dépense — recherches en mode réel"
          subtitle="Bascule automatique en simulation dès le plafond atteint"
          right={<Badge tone={searchBudget.budgetExceeded ? "danger" : "good"}>{searchBudget.budgetExceeded ? "PLAFOND ATTEINT" : "SOUS LE PLAFOND"}</Badge>}
        />
        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-atlas-muted">Recherches ce mois</p>
            <p className="mt-1 font-display text-xl font-semibold text-atlas-text">{searchBudget.searchesThisMonth}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-atlas-muted">Dépense estimée</p>
            <p className="mt-1 font-display text-xl font-semibold text-atlas-text">{searchBudget.estimatedSpendEUR.toFixed(2)}€</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-atlas-muted">Plafond configuré</p>
            <p className="mt-1 font-display text-xl font-semibold text-atlas-text">{searchBudget.maxMonthlySpendEUR}€</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-atlas-muted">Mode actuel</p>
            <p className="mt-1 font-display text-xl font-semibold text-atlas-text">{settings?.simulationMode ? "Simulation" : "Réel"}</p>
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Providers de données" subtitle="Le cœur d'ATLAS n'est jamais dépendant d'un seul fournisseur" />
        <div className="flex flex-wrap gap-2 p-5">
          {providers.map((p) => (
            <Badge key={p.name} tone={p.configured ? "good" : "neutral"}>{p.name} {p.configured ? "✓ configuré" : "non configuré"}</Badge>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="File de tâches" subtitle="Répartition par statut" />
        <div className="flex flex-wrap gap-3 p-5">
          {taskCounts.map((t) => (
            <Badge key={t.status} tone={t.status === "FAILED" ? "danger" : t.status === "RUNNING" ? "accent" : "neutral"}>
              {t.status}: {t._count._all}
            </Badge>
          ))}
          {oldestPending && (
            <span className="text-xs text-atlas-muted">
              Plus ancienne tâche en attente due le {new Date(oldestPending.nextRunAt).toLocaleString("fr-FR")}
            </span>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Prochaines tâches planifiées" />
        {upcomingTasks.length === 0 ? (
          <div className="p-6"><EmptyState title="Aucune tâche planifiée" description="Lancez un cycle pour générer des tâches de scan." /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atlas-border text-left text-xs uppercase tracking-wide text-atlas-muted">
                <th className="px-5 py-2 font-normal">Route</th>
                <th className="px-5 py-2 font-normal">Prochain scan</th>
                <th className="px-5 py-2 font-normal">Priorité</th>
                <th className="px-5 py-2 font-normal">Fréquence</th>
              </tr>
            </thead>
            <tbody>
              {upcomingTasks.map((t) => (
                <tr key={t.id} className="border-b border-atlas-border/60 last:border-0">
                  <td className="px-5 py-2 text-atlas-text">{t.origin.iata} → {t.destination.iata}</td>
                  <td className="px-5 py-2 text-atlas-muted">{new Date(t.nextRunAt).toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-2 text-atlas-muted">{t.priority}</td>
                  <td className="px-5 py-2 text-atlas-muted">{t.frequencyHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Journal des scans" subtitle="25 dernières entrées" />
        <div className="max-h-96 overflow-y-auto">
          {recentLogs.length === 0 ? (
            <div className="p-6"><EmptyState title="Aucun scan encore exécuté" /></div>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {recentLogs.map((l) => (
                  <tr key={l.id} className="border-b border-atlas-border/60 last:border-0">
                    <td className="px-5 py-2 text-atlas-muted">{new Date(l.createdAt).toLocaleString("fr-FR")}</td>
                    <td className="px-5 py-2"><Badge tone={l.success ? "good" : "danger"}>{l.success ? "OK" : "ERREUR"}</Badge></td>
                    <td className="px-5 py-2 text-atlas-muted">{l.provider}</td>
                    <td className="px-5 py-2 text-atlas-muted">{l.durationMs}ms</td>
                    <td className="px-5 py-2 text-atlas-text">{l.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

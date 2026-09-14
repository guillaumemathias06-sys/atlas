import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, StatTile } from "@/components/ui";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const [settings, totalObs, totalDeals, totalAlerts, scanLogs24h, errorLogs24h, oldestPending, newestScan, taskCounts, dbSizeInfo] =
    await Promise.all([
      prisma.userSettings.findUnique({ where: { id: "singleton" } }),
      prisma.priceObservation.count(),
      prisma.deal.count(),
      prisma.alert.count(),
      prisma.scanLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.scanLog.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.searchTask.findFirst({ where: { status: "PENDING" }, orderBy: { nextRunAt: "asc" } }),
      prisma.scanLog.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.searchTask.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.auditLog.count(),
    ]);

  const providers = listProviders();
  const errorRate24h = scanLogs24h > 0 ? Math.round((errorLogs24h / scanLogs24h) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">System Health</h1>
      <p className="mt-1 text-sm text-atlas-muted">Observabilité du moteur, des providers et de la base de données.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Moteur" value={<Badge tone={settings?.engineEnabled ? "good" : "danger"}>{settings?.engineEnabled ? "ACTIF" : "PAUSE"}</Badge>} />
        <StatTile label="Scans (24h)" value={scanLogs24h} />
        <StatTile label="Taux d'erreur (24h)" value={`${errorRate24h}%`} />
        <StatTile label="Dernier scan" value={newestScan ? new Date(newestScan.createdAt).toLocaleTimeString("fr-FR") : "—"} />
        <StatTile label="Observations totales" value={totalObs} />
        <StatTile label="Deals totaux" value={totalDeals} />
        <StatTile label="Alertes totales" value={totalAlerts} />
        <StatTile label="Entrées d'audit" value={dbSizeInfo} />
      </div>

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
        <CardHeader title="Providers" subtitle="Statut de configuration — le cœur d'ATLAS n'est jamais dépendant d'un seul fournisseur" />
        <div className="flex flex-wrap gap-2 p-5">
          {providers.map((p) => (
            <Badge key={p.name} tone={p.configured ? "good" : "neutral"}>{p.name}: {p.configured ? "configuré" : "non configuré (mock actif)"}</Badge>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Base de données" subtitle="SQLite local (dev) — portable vers PostgreSQL en production" />
        <div className="p-5 text-xs text-atlas-muted">
          Voir <code className="text-atlas-accent">/docs/architecture.md</code> pour le plan de migration vers PostgreSQL.
        </div>
      </Card>
    </div>
  );
}

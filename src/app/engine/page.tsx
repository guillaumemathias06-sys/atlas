import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, StatTile, Button, EmptyState } from "@/components/ui";
import { runScanNow, toggleEngine } from "@/lib/actions";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export default async function EnginePage() {
  const [settings, pendingCount, runningCount, failedRecent, recentLogs, upcomingTasks] = await Promise.all([
    prisma.userSettings.findUnique({ where: { id: "singleton" } }),
    prisma.searchTask.count({ where: { status: "PENDING" } }),
    prisma.searchTask.count({ where: { status: "RUNNING" } }),
    prisma.scanLog.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } } }),
    prisma.scanLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.searchTask.findMany({
      where: { status: "PENDING" },
      orderBy: { nextRunAt: "asc" },
      take: 10,
      include: { origin: true, destination: true },
    }),
  ]);

  const providers = listProviders();

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-atlas-text">Search Engine Status</h1>
          <p className="mt-1 text-sm text-atlas-muted">File de tâches, planification adaptative, journaux d'exécution.</p>
        </div>
        <div className="flex gap-2">
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
        <StatTile label="Statut" value={<Badge tone={settings?.engineEnabled ? "good" : "danger"}>{settings?.engineEnabled ? "ACTIF" : "EN PAUSE"}</Badge>} />
        <StatTile label="Tâches en attente" value={pendingCount} />
        <StatTile label="Tâches en cours" value={runningCount} />
        <StatTile label="Erreurs (24h)" value={failedRecent} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Providers de données" subtitle="Architecture multi-fournisseurs — mock activé par défaut" />
        <div className="flex flex-wrap gap-2 p-5">
          {providers.map((p) => (
            <Badge key={p.name} tone={p.configured ? "good" : "neutral"}>
              {p.name} {p.configured ? "✓ configuré" : "non configuré"}
            </Badge>
          ))}
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
                    <td className="px-5 py-2">
                      <Badge tone={l.success ? "good" : "danger"}>{l.success ? "OK" : "ERREUR"}</Badge>
                    </td>
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

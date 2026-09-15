import { prisma } from "@/lib/db";
import { Card, Badge, EmptyState, Button, scoreTone } from "@/components/ui";
import { markAlertRead, markAllAlertsRead } from "@/lib/actions";

export const dynamic = "force-dynamic";

const TIER_TONE: Record<string, "gold" | "good" | "accent" | "warn"> = {
  EXCEPTIONAL: "gold",
  GREAT: "good",
  GOOD: "accent",
  INTERESTING: "warn",
};

export default async function AlertsPage() {
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { deal: { include: { observation: { include: { destination: true, origin: true } } } } },
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-atlas-text">Alerts</h1>
          <p className="mt-1 text-sm text-atlas-muted">{unreadCount} alerte(s) non lue(s)</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllAlertsRead}>
            <Button variant="ghost" type="submit">Tout marquer comme lu</Button>
          </form>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Aucune alerte pour l'instant" description="Les alertes apparaissent quand un deal dépasse vos seuils configurés dans Settings." />
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className={`flex items-start justify-between gap-4 p-4 ${!a.read ? "border-atlas-accent/40" : ""}`}>
              <div className="flex items-start gap-3">
                <Badge tone={TIER_TONE[a.tier] ?? "neutral"}>{a.tier}</Badge>
                <div>
                  <p className="text-sm text-atlas-text">{a.message}</p>
                  <p className="mt-1 text-xs text-atlas-muted">
                    {new Date(a.createdAt).toLocaleString("fr-FR")} ·{" "}
                    <a href={`/deals/${a.dealId}`} className="text-atlas-accent">voir le deal</a>
                  </p>
                </div>
              </div>
              {!a.read && (
                <form action={markAlertRead.bind(null, a.id)}>
                  <Button variant="ghost" type="submit" className="shrink-0 text-xs">Marquer lu</Button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

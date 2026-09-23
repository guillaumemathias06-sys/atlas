import { prisma } from "@/lib/db";
import { Card, StatTile, Badge, EmptyState, Button } from "@/components/ui";
import { DealCard } from "@/components/DealCard";
import { runScanNow } from "@/lib/actions";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  const [settings, topDealsRaw, scansToday, destinationsWatched, observationsCount, dealsCount, nextTask, recentBigDrops] =
    await Promise.all([
      prisma.userSettings.findUnique({ where: { id: "singleton" } }),
      prisma.deal.findMany({
        where: { status: "ACTIVE" },
        orderBy: { atlasScore: "desc" },
        take: 6,
        include: { observation: { include: { destination: true, origin: true } } },
      }),
      prisma.scanLog.count({ where: { createdAt: { gte: startOfToday() } } }),
      prisma.airport.count({ where: { isDestinationOk: true, allowed: true } }),
      prisma.priceObservation.count(),
      prisma.deal.count(),
      prisma.searchTask.findFirst({ where: { status: "PENDING" }, orderBy: { nextRunAt: "asc" } }),
      prisma.deal.count({ where: { priceVsMedianPct: { lte: -20 }, createdAt: { gte: startOfToday() } } }),
    ]);

  const topDeals = topDealsRaw.map((d) => ({
    id: d.id,
    destinationCity: d.observation.destination.city,
    destinationIata: d.observation.destination.iata,
    originIata: d.observation.origin.iata,
    priceEUR: d.observation.priceEUR,
    atlasScore: d.atlasScore,
    fareScore: d.fareScore,
    seasonScore: d.seasonScore,
    experienceScore: d.experienceScore,
    explanation: d.explanation,
    departDate: d.observation.departDate,
    returnDate: d.observation.returnDate,
    tripLengthDays: d.observation.tripLengthDays,
    stops: d.observation.stops,
    returnStops: d.observation.returnStops,
    airline: d.observation.airline,
  }));

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-atlas-text">Dashboard</h1>
          <p className="mt-1 text-sm text-atlas-muted">
            ATLAS surveille en continu le marché mondial des vols et détecte les opportunités exceptionnelles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={settings?.engineEnabled ? "good" : "danger"}>
            {settings?.engineEnabled ? "Moteur actif" : "Moteur en pause"}
          </Badge>
          {settings?.simulationMode && <Badge tone="accent">Mode simulation</Badge>}
          <form action={runScanNow}>
            <Button type="submit">Lancer un scan maintenant</Button>
          </form>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
        <StatTile label="Recherches aujourd'hui" value={scansToday} />
        <StatTile label="Destinations surveillées" value={destinationsWatched} />
        <StatTile label="Prix observés" value={observationsCount} />
        <StatTile label="Deals détectés" value={dealsCount} />
        <StatTile label="Baisses importantes (24h)" value={recentBigDrops} hint="≥ 20% sous la médiane" />
        <StatTile
          label="Prochaine vague de recherche"
          value={nextTask ? new Date(nextTask.nextRunAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
        />
        <StatTile label="ATLAS Score minimum" value={settings?.minAtlasScore ?? "—"} />
        <StatTile label="Profil actif" value={settings?.activeProfileId ? "configuré" : "aucun"} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-atlas-text">Top Opportunities</h2>
        <a href="/deals" className="text-xs font-medium text-atlas-accent">Voir tous les deals →</a>
      </div>

      {topDeals.length === 0 ? (
        <EmptyState
          title="Aucun deal détecté pour l'instant"
          description="Lancez un scan pour peupler ATLAS avec des observations de prix en mode simulation, ou attendez le prochain cycle automatique."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}

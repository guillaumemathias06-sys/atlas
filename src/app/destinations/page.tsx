import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const destinations = await prisma.destinationProfile.findMany({ orderBy: { iata: "asc" } });
  const airports = await prisma.airport.findMany({ where: { iata: { in: destinations.map((d) => d.iata) } } });
  const airportByIata = new Map(airports.map((a) => [a.iata, a]));

  const bestPrices = await prisma.priceObservation.groupBy({
    by: ["destinationId"],
    _min: { priceEUR: true },
    _count: { _all: true },
  });
  const destIdToStats = new Map(bestPrices.map((b) => [b.destinationId, b]));
  const airportIdByIata = new Map(airports.map((a) => [a.iata, a.id]));

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">Destination Explorer</h1>
      <p className="mt-1 text-sm text-atlas-muted">Climat, saisonnalité, événements et historique de prix par destination.</p>

      {destinations.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Aucune destination configurée" />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => {
            const airport = airportByIata.get(d.iata);
            const airportId = airportIdByIata.get(d.iata);
            const stats = airportId ? destIdToStats.get(airportId) : undefined;
            return (
              <Link
                key={d.iata}
                href={`/destinations/${d.iata}`}
                className="block"
              >
                <Card className="p-5 transition hover:border-atlas-accent/40">
                  <p className="font-display text-lg font-semibold text-atlas-text">{airport?.city ?? d.iata}</p>
                  <p className="text-xs text-atlas-muted">{d.region}</p>
                  <p className="mt-3 text-xs text-atlas-muted">{d.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge tone="accent">{stats?._count._all ?? 0} observations</Badge>
                    {stats?._min.priceEUR && <span className="font-display text-sm font-semibold text-atlas-text">dès {Math.round(stats._min.priceEUR)}€</span>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { computeSeasonScore } from "@/lib/scoring/seasonScore";
import { DealCard } from "@/components/DealCard";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default async function DestinationDetailPage({ params }: { params: { iata: string } }) {
  const profile = await prisma.destinationProfile.findUnique({
    where: { iata: params.iata.toUpperCase() },
    include: { seasonMonths: { orderBy: { month: "asc" } }, events: true },
  });
  if (!profile) notFound();

  const airport = await prisma.airport.findUnique({ where: { iata: profile.iata } });

  const observations = await prisma.priceObservation.findMany({
    where: { destination: { iata: profile.iata } },
    orderBy: { priceEUR: "asc" },
    take: 200,
  });
  const bestPrice = observations[0]?.priceEUR;
  const worstPrice = observations[observations.length - 1]?.priceEUR;

  const deals = await prisma.deal.findMany({
    where: { status: "ACTIVE", observation: { destination: { iata: profile.iata } } },
    orderBy: { atlasScore: "desc" },
    take: 6,
    include: { observation: { include: { destination: true, origin: true } } },
  });

  const monthsRanked = profile.seasonMonths
    .map((m) => ({ ...m, computed: computeSeasonScore(m).score }))
    .sort((a, b) => b.computed - a.computed);
  const bestMonths = monthsRanked.slice(0, 3).filter((m) => m.computed >= 60);
  const worstMonths = [...monthsRanked].reverse().slice(0, 3).filter((m) => m.computed < 55);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <a href="/destinations" className="text-xs text-atlas-muted hover:text-atlas-accent">← Toutes les destinations</a>

      <div className="mt-4">
        <h1 className="font-display text-3xl font-bold text-atlas-text">
          {airport?.city ?? profile.iata}{airport?.country && <span className="ml-2 text-lg font-normal text-atlas-muted">{airport.country}</span>}
        </h1>
        <p className="mt-1 text-sm text-atlas-muted">{profile.region} · {profile.description}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-atlas-muted">Meilleur tarif observé</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-atlas-text">{bestPrice ? `${Math.round(bestPrice)}€` : "—"}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-atlas-muted">Tarif le plus haut observé</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-atlas-text">{worstPrice ? `${Math.round(worstPrice)}€` : "—"}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-atlas-muted">Observations</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-atlas-text">{observations.length}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-atlas-muted">Deals actifs</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-atlas-text">{deals.length}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Meilleure période pour partir" subtitle="Basé sur le climat, l'affluence et les événements" />
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-atlas-good">Mois recommandés</p>
            {bestMonths.length ? (
              <div className="flex flex-wrap gap-1.5">
                {bestMonths.map((m) => <Badge key={m.id} tone="good">{MONTH_NAMES[m.month - 1]} ({m.computed})</Badge>)}
              </div>
            ) : <p className="text-xs text-atlas-muted">Données insuffisantes</p>}
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-atlas-danger">Mois déconseillés</p>
            {worstMonths.length ? (
              <div className="flex flex-wrap gap-1.5">
                {worstMonths.map((m) => <Badge key={m.id} tone="danger">{MONTH_NAMES[m.month - 1]} ({m.computed})</Badge>)}
              </div>
            ) : <p className="text-xs text-atlas-muted">Données insuffisantes</p>}
          </div>
        </div>
        <div className="border-t border-atlas-border px-5 py-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-atlas-muted">
                <th className="py-1 font-normal">Mois</th>
                <th className="py-1 font-normal">Temp. moy.</th>
                <th className="py-1 font-normal">Pluie (mm)</th>
                <th className="py-1 font-normal">Affluence</th>
                <th className="py-1 font-normal">Season Score</th>
              </tr>
            </thead>
            <tbody>
              {profile.seasonMonths.map((m) => (
                <tr key={m.id} className="border-t border-atlas-border/60">
                  <td className="py-1.5 text-atlas-text">{MONTH_NAMES[m.month - 1]}</td>
                  <td className="py-1.5 text-atlas-muted">{m.avgTempC ?? "—"}°C</td>
                  <td className="py-1.5 text-atlas-muted">{m.rainfallMm ?? "—"}</td>
                  <td className="py-1.5 text-atlas-muted">{m.touristCrowding}/100</td>
                  <td className="py-1.5 font-medium text-atlas-text">{computeSeasonScore(m).score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {profile.events.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Événements & périodes exceptionnelles" />
          <div className="space-y-3 p-5">
            {profile.events.map((e) => (
              <div key={e.id} className="rounded-xl border border-atlas-border/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-atlas-text">{e.name}</p>
                  <Badge tone="gold">potentiel {e.potentialScore}</Badge>
                </div>
                <p className="mt-1 text-xs text-atlas-muted">{e.description}</p>
                {e.recommendation && <p className="mt-1 text-xs italic text-atlas-muted">💡 {e.recommendation}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-atlas-text">Deals actuellement détectés</h2>
        {deals.length === 0 ? (
          <EmptyState title="Aucun deal actif pour cette destination" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => (
              <DealCard
                key={d.id}
                deal={{
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
                  airline: d.observation.airline,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

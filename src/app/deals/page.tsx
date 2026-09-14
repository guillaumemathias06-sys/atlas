import { prisma } from "@/lib/db";
import { DealCard } from "@/components/DealCard";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    where: { status: "ACTIVE" },
    orderBy: { atlasScore: "desc" },
    take: 60,
    include: { observation: { include: { destination: true, origin: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">Deals</h1>
      <p className="mt-1 text-sm text-atlas-muted">Toutes les opportunités actives, triées par ATLAS Score.</p>

      {deals.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Aucun deal actif" description="Lancez un scan depuis le Dashboard pour générer des observations." />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}

import { prisma } from "@/lib/db";
import { Card, CardHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const observations = await prisma.priceObservation.findMany({
    orderBy: { observedAt: "desc" },
    take: 100,
    include: { origin: true, destination: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">Price History</h1>
      <p className="mt-1 text-sm text-atlas-muted">Les 100 dernières observations de prix enregistrées par ATLAS.</p>

      <Card className="mt-8">
        <CardHeader title="Observations récentes" subtitle={`${observations.length} lignes`} />
        {observations.length === 0 ? (
          <div className="p-6"><EmptyState title="Aucune observation enregistrée" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-atlas-border text-left text-xs uppercase tracking-wide text-atlas-muted">
                  <th className="px-5 py-2 font-normal">Observée le</th>
                  <th className="px-5 py-2 font-normal">Route</th>
                  <th className="px-5 py-2 font-normal">Dates</th>
                  <th className="px-5 py-2 font-normal">Prix</th>
                  <th className="px-5 py-2 font-normal">Compagnie</th>
                  <th className="px-5 py-2 font-normal">Escales</th>
                  <th className="px-5 py-2 font-normal">Provider</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((o) => (
                  <tr key={o.id} className="border-b border-atlas-border/60 last:border-0 hover:bg-atlas-line/10">
                    <td className="px-5 py-2 text-atlas-muted">{new Date(o.observedAt).toLocaleString("fr-FR")}</td>
                    <td className="px-5 py-2 font-medium text-atlas-text">{o.origin.iata} → {o.destination.iata}</td>
                    <td className="px-5 py-2 text-atlas-muted">
                      {new Date(o.departDate).toLocaleDateString("fr-FR")} → {new Date(o.returnDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-2 font-semibold text-atlas-text">{Math.round(o.priceEUR)}€</td>
                    <td className="px-5 py-2 text-atlas-muted">{o.airline}</td>
                    <td className="px-5 py-2 text-atlas-muted">{o.stops}</td>
                    <td className="px-5 py-2 text-atlas-muted">{o.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

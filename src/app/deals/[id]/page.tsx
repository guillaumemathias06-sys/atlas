import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, ScoreRing, scoreTone } from "@/components/ui";

export const dynamic = "force-dynamic";

function ScoreRow({ label, score }: { label: string; score: number }) {
  const tone = scoreTone(score);
  return (
    <div className="flex items-center justify-between border-b border-atlas-border py-3 last:border-0">
      <span className="text-sm text-atlas-muted">{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-atlas-line/40">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(score)}%`,
              backgroundColor: tone === "gold" ? "#f2c14e" : tone === "good" ? "#4ade80" : tone === "accent" ? "#3fd6c9" : tone === "warn" ? "#f59e0b" : "#ff6b6b",
            }}
          />
        </div>
        <span className="w-8 text-right font-display text-sm font-semibold text-atlas-text">{Math.round(score)}</span>
      </div>
    </div>
  );
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const deal = await prisma.deal.findUnique({
    where: { id: params.id },
    include: { observation: { include: { destination: true, origin: true } } },
  });
  if (!deal) notFound();

  const obs = deal.observation;

  const priceHistory = await prisma.priceObservation.findMany({
    where: { originId: obs.originId, destinationId: obs.destinationId },
    orderBy: { observedAt: "desc" },
    take: 15,
  });

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <a href="/deals" className="text-xs text-atlas-muted hover:text-atlas-accent">← Retour aux deals</a>

      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-atlas-text">
            {obs.origin.iata} → {obs.destination.city} ({obs.destination.iata})
          </h1>
          <p className="mt-1 text-sm text-atlas-muted">
            {new Date(obs.departDate).toLocaleDateString("fr-FR")} → {new Date(obs.returnDate).toLocaleDateString("fr-FR")} · {obs.tripLengthDays} jours · {obs.airline}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone={obs.stops === 0 ? "good" : "neutral"}>{obs.stops === 0 ? "Vol direct" : `${obs.stops} escale(s)`}</Badge>
            <Badge tone={obs.selfTransfer ? "danger" : "neutral"}>{obs.selfTransfer ? "Correspondance non protégée" : "Correspondance protégée"}</Badge>
            <Badge tone={obs.baggageIncluded ? "good" : "neutral"}>{obs.baggageIncluded ? "Bagage inclus" : "Bagage non inclus"}</Badge>
            <Badge tone="neutral">{obs.cabinClass}</Badge>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ScoreRing score={Math.round(deal.atlasScore)} size={96} />
          <p className="font-display text-3xl font-bold text-atlas-text">{Math.round(obs.priceEUR)}€</p>
          <p className="text-xs text-atlas-muted">A/R par personne</p>
        </div>
      </div>

      <Card className="mt-6 p-5">
        <p className="text-sm leading-relaxed text-atlas-text">{deal.explanation}</p>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pourquoi ce score" subtitle="Décomposition ATLAS Score" />
          <div className="px-5 py-2">
            <ScoreRow label="Fare Intelligence" score={deal.fareScore} />
            <ScoreRow label="Season" score={deal.seasonScore} />
            <ScoreRow label="Experience" score={deal.experienceScore} />
            <ScoreRow label="Flight Quality" score={deal.flightQualityScore} />
            <ScoreRow label="Adéquation durée" score={deal.durationFitScore} />
            <ScoreRow label="Préférences" score={deal.preferenceScore} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Comparaison au marché" subtitle="Cette route, historique récent" />
          <div className="space-y-2 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-atlas-muted">vs prix médian</span>
              <span className={deal.priceVsMedianPct && deal.priceVsMedianPct < 0 ? "text-atlas-good" : "text-atlas-text"}>
                {deal.priceVsMedianPct !== null ? `${deal.priceVsMedianPct > 0 ? "+" : ""}${deal.priceVsMedianPct}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-atlas-muted">vs prix moyen</span>
              <span className="text-atlas-text">{deal.priceVsAvgPct !== null ? `${deal.priceVsAvgPct > 0 ? "+" : ""}${deal.priceVsAvgPct}%` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-atlas-muted">vs plus bas historique</span>
              <span className="text-atlas-text">{deal.priceVsAllTimeLowPct !== null ? `${deal.priceVsAllTimeLowPct > 0 ? "+" : ""}${deal.priceVsAllTimeLowPct}%` : "—"}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Historique des observations" subtitle={`${obs.origin.iata} → ${obs.destination.iata}`} />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-atlas-border text-left text-xs uppercase tracking-wide text-atlas-muted">
              <th className="px-5 py-2 font-normal">Date d'observation</th>
              <th className="px-5 py-2 font-normal">Prix</th>
              <th className="px-5 py-2 font-normal">Compagnie</th>
              <th className="px-5 py-2 font-normal">Escales</th>
              <th className="px-5 py-2 font-normal">Durée totale</th>
            </tr>
          </thead>
          <tbody>
            {priceHistory.map((p) => (
              <tr key={p.id} className="border-b border-atlas-border/60 last:border-0">
                <td className="px-5 py-2 text-atlas-muted">{new Date(p.observedAt).toLocaleString("fr-FR")}</td>
                <td className="px-5 py-2 font-medium text-atlas-text">{Math.round(p.priceEUR)}€</td>
                <td className="px-5 py-2 text-atlas-muted">{p.airline}</td>
                <td className="px-5 py-2 text-atlas-muted">{p.stops}</td>
                <td className="px-5 py-2 text-atlas-muted">{Math.round(p.totalDurationMinutes / 60)}h{p.totalDurationMinutes % 60}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

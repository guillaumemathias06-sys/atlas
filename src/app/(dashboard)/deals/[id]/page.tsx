import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, ScoreRing, scoreTone } from "@/components/ui";
import { compareDepartureOptions } from "@/lib/departure/realDepartureCost";
import { hasCalendarConflict } from "@/lib/calendar/conflicts";

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

  const [departureComparison, calendarBlocks] = await Promise.all([
    compareDepartureOptions(obs.destinationId, obs.originId),
    prisma.calendarBlock.findMany({ where: { blocking: true } }),
  ]);

  const conflict = hasCalendarConflict(obs.departDate, obs.returnDate, calendarBlocks);

  // True Trip Cost (section 17) — estimation calculée à la volée à partir des données
  // déjà connues (prix du billet + coût d'accès à l'aéroport de départ). Les postes
  // hôtel/parking/transfert seront ajoutés quand une source de données existera (Phase 6+).
  const accessCostEUR = obs.origin.accessCostEUR ?? 0;
  const trueTripCostEUR = obs.priceEUR + accessCostEUR;

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
            <Badge tone={obs.stops === 0 ? "good" : "neutral"}>Aller : {obs.stops === 0 ? "direct" : `${obs.stops} escale(s)`}</Badge>
            <Badge tone={obs.returnStops === 0 ? "good" : "neutral"}>Retour : {obs.returnStops === 0 ? "direct" : `${obs.returnStops} escale(s)`}</Badge>
            <Badge tone={obs.selfTransfer || obs.returnSelfTransfer ? "danger" : "neutral"}>
              {obs.selfTransfer || obs.returnSelfTransfer ? "Correspondance non protégée" : "Correspondances protégées"}
            </Badge>
            <Badge tone={obs.baggageIncluded ? "good" : "neutral"}>{obs.baggageIncluded ? "Bagage inclus" : "Bagage non inclus"}</Badge>
            <Badge tone="neutral">{obs.cabinClass}</Badge>
            {conflict && <Badge tone="danger">⚠ Chevauche une période bloquée au calendrier</Badge>}
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

      <Card className="mt-6">
        <CardHeader title="Aller / Retour" subtitle="Un bon deal est un aller-retour — les deux tronçons comptent (section 25)" />
        <div className="grid grid-cols-1 divide-y divide-atlas-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-atlas-muted">
              Aller — {new Date(obs.departDate).toLocaleDateString("fr-FR")}
            </p>
            <p className="font-display text-xl font-semibold text-atlas-text">
              {obs.departTime ?? "—"} <span className="text-atlas-muted">→</span> {obs.arriveTime ?? "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={obs.stops === 0 ? "good" : "neutral"}>{obs.stops === 0 ? "Direct" : `${obs.stops} escale(s)`}</Badge>
              {obs.stops > 0 && <Badge tone="neutral">{Math.round(obs.layoverMinutes / 60)}h{obs.layoverMinutes % 60} d'escale</Badge>}
              {obs.selfTransfer && <Badge tone="danger">Non protégée</Badge>}
            </div>
          </div>
          <div className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-atlas-muted">
              Retour — {new Date(obs.returnDate).toLocaleDateString("fr-FR")}
            </p>
            <p className="font-display text-xl font-semibold text-atlas-text">
              {obs.returnDepartTime ?? "—"} <span className="text-atlas-muted">→</span> {obs.returnArriveTime ?? "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={obs.returnStops === 0 ? "good" : "neutral"}>{obs.returnStops === 0 ? "Direct" : `${obs.returnStops} escale(s)`}</Badge>
              {obs.returnStops > 0 && <Badge tone="neutral">{Math.round(obs.returnLayoverMinutes / 60)}h{obs.returnLayoverMinutes % 60} d'escale</Badge>}
              {obs.returnSelfTransfer && <Badge tone="danger">Non protégée</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="True Trip Cost" subtitle="Coût réel estimé (section 17)" />
          <div className="space-y-2 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-atlas-muted">Billet d'avion</span>
              <span className="text-atlas-text">{Math.round(obs.priceEUR)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-atlas-muted">Accès à l'aéroport ({obs.origin.iata})</span>
              <span className="text-atlas-text">{accessCostEUR > 0 ? `${Math.round(accessCostEUR)}€` : "inclus (base)"}</span>
            </div>
            <div className="flex justify-between border-t border-atlas-border pt-2 font-semibold">
              <span className="text-atlas-text">Total estimé</span>
              <span className="text-atlas-text">{Math.round(trueTripCostEUR)}€</span>
            </div>
            <p className="pt-1 text-[11px] text-atlas-muted">
              Hôtel/parking/transfert non inclus (Phase 6 — aucune source de données branchée pour l'instant).
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Aéroports de départ alternatifs" subtitle="Real Departure Cost (section 18)" />
          <div className="px-5 py-4">
            {departureComparison.alternatives.length === 0 ? (
              <p className="text-xs text-atlas-muted">Pas encore assez d'observations sur d'autres aéroports pour comparer.</p>
            ) : (
              <div className="space-y-2">
                {departureComparison.alternatives.slice(0, 4).map((alt) => {
                  const isRecommended = departureComparison.recommended?.originId === alt.originId;
                  const savings = (departureComparison.chosen?.totalRealCostEUR ?? 0) - alt.totalRealCostEUR;
                  return (
                    <div key={alt.originId} className="flex items-center justify-between text-sm">
                      <span className="text-atlas-text">{alt.originIata} <span className="text-atlas-muted">({Math.round(alt.totalRealCostEUR)}€ réel)</span></span>
                      {isRecommended ? (
                        <Badge tone="good">économie {Math.round(savings)}€ →recommandé</Badge>
                      ) : (
                        <span className="text-xs text-atlas-muted">
                          {savings > 0 ? `économie ${Math.round(savings)}€` : `+${Math.round(-savings)}€`} (seuil {alt.minSavingsToUseEUR}€)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

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

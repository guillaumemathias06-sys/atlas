import Link from "next/link";
import { Card, ScoreRing, Badge, scoreTone } from "@/components/ui";

export interface DealCardData {
  id: string;
  destinationCity: string;
  destinationIata: string;
  originIata: string;
  priceEUR: number;
  atlasScore: number;
  fareScore: number;
  seasonScore: number;
  experienceScore: number;
  explanation: string;
  departDate: Date;
  returnDate: Date;
  tripLengthDays: number;
  stops: number;
  returnStops: number;
  airline: string;
}

export function DealCard({ deal }: { deal: DealCardData }) {
  const tone = scoreTone(deal.atlasScore);
  return (
    <Card className="group flex flex-col gap-4 p-5 transition hover:border-atlas-accent/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg font-semibold text-atlas-text">{deal.destinationCity}</p>
          <p className="text-xs text-atlas-muted">
            {deal.originIata} → {deal.destinationIata} · {deal.tripLengthDays}j · aller {deal.stops === 0 ? "direct" : `${deal.stops} esc.`} · retour {deal.returnStops === 0 ? "direct" : `${deal.returnStops} esc.`}
          </p>
        </div>
        <ScoreRing score={Math.round(deal.atlasScore)} size={56} />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold text-atlas-text">{Math.round(deal.priceEUR)}€</span>
        <span className="text-xs text-atlas-muted">A/R · {deal.airline}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone={tone}>ATLAS {Math.round(deal.atlasScore)}</Badge>
        <Badge tone="neutral">Fare {Math.round(deal.fareScore)}</Badge>
        <Badge tone="neutral">Season {Math.round(deal.seasonScore)}</Badge>
        <Badge tone="neutral">Exp {Math.round(deal.experienceScore)}</Badge>
      </div>

      <p className="line-clamp-3 text-xs leading-relaxed text-atlas-muted">{deal.explanation}</p>

      <Link
        href={`/deals/${deal.id}`}
        className="mt-auto text-xs font-medium text-atlas-accent opacity-0 transition group-hover:opacity-100"
      >
        Voir le détail →
      </Link>
    </Card>
  );
}

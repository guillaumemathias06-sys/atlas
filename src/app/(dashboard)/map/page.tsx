import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, EmptyState, scoreTone } from "@/components/ui";

export const dynamic = "force-dynamic";

function project(lat: number, lon: number) {
  const x = ((lon + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

export default async function MapPage() {
  const bestDeals = await prisma.deal.findMany({
    where: { status: "ACTIVE" },
    orderBy: { atlasScore: "desc" },
    include: { observation: { include: { destination: true, origin: true } } },
  });

  // Un seul point par destination : le meilleur deal actif
  const byDestination = new Map<string, (typeof bestDeals)[number]>();
  for (const d of bestDeals) {
    const key = d.observation.destination.iata;
    if (!byDestination.has(key)) byDestination.set(key, d);
  }
  const points = Array.from(byDestination.values());

  const toneColor: Record<string, string> = {
    gold: "#f2c14e",
    good: "#4ade80",
    accent: "#3fd6c9",
    warn: "#f59e0b",
    danger: "#ff6b6b",
  };

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">ATLAS Map</h1>
      <p className="mt-1 text-sm text-atlas-muted">
        Opportunités détectées depuis vos aéroports de départ autorisés, positionnées sur la carte du monde.
      </p>

      {points.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Aucune opportunité à afficher" description="Lancez un scan pour peupler la carte." />
        </div>
      ) : (
        <Card className="mt-8 overflow-hidden">
          <div className="relative aspect-[2/1] w-full bg-atlas-bg">
            <svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              {Array.from({ length: 11 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 10} y1={0} x2={i * 10} y2={50} stroke="#1e2947" strokeWidth="0.1" />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * 10} x2={100} y2={i * 10} stroke="#1e2947" strokeWidth="0.1" />
              ))}
              <line x1="0" y1="25" x2="100" y2="25" stroke="#3fd6c9" strokeOpacity="0.25" strokeWidth="0.15" />
            </svg>

            {points.map((d) => {
              const { x, y } = project(d.observation.destination.latitude ?? 0, d.observation.destination.longitude ?? 0);
              const tone = scoreTone(d.atlasScore);
              return (
                <div
                  key={`marker-${d.id}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <Link href={`/deals/${d.id}`} className="group relative flex flex-col items-center">
                    <span
                      className="block h-3 w-3 rounded-full ring-4 transition group-hover:scale-125"
                      style={{ backgroundColor: toneColor[tone], boxShadow: `0 0 12px ${toneColor[tone]}` }}
                    />
                    <div className="pointer-events-none absolute top-5 z-10 hidden w-40 -translate-x-1/2 rounded-lg border border-atlas-border bg-atlas-panel p-2.5 text-left shadow-panel group-hover:block">
                      <p className="text-xs font-semibold text-atlas-text">{d.observation.destination.city}</p>
                      <p className="text-[11px] text-atlas-muted">{Math.round(d.observation.priceEUR)}€ · ATLAS {Math.round(d.atlasScore)}</p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mt-8">
        <CardHeader title="Destinations détectées" subtitle={`${points.length} destination(s)`} />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {points
            .sort((a, b) => b.atlasScore - a.atlasScore)
            .map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="flex items-center justify-between rounded-xl border border-atlas-border bg-atlas-panel/60 px-4 py-3 transition hover:border-atlas-accent/40"
              >
                <div>
                  <p className="text-sm font-medium text-atlas-text">{d.observation.destination.city}</p>
                  <p className="text-xs text-atlas-muted">{Math.round(d.observation.priceEUR)}€</p>
                </div>
                <Badge tone={scoreTone(d.atlasScore)}>{Math.round(d.atlasScore)}</Badge>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

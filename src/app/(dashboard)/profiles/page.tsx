import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, Button } from "@/components/ui";
import { setActiveProfile } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const profiles = await prisma.travelProfile.findMany({ orderBy: { isBuiltIn: "desc" } });

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">Travel Profiles</h1>
      <p className="mt-1 text-sm text-atlas-muted">
        Chaque profil applique des règles différentes de tolérance aux escales, aux horaires et au confort.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {profiles.map((p) => (
          <Card key={p.id} className={`p-5 ${p.isActive ? "border-atlas-accent/50" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-atlas-text">{p.name.replace("_", " ")}</p>
              {p.isActive && <Badge tone="accent">Actif</Badge>}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-atlas-muted">
              <p>Escales max : <span className="text-atlas-text">{p.maxStops}</span></p>
              <p>Self-transfer : <span className="text-atlas-text">{p.maxSelfTransfer ? "autorisé" : "refusé"}</span></p>
              <p>Départ : <span className="text-atlas-text">{p.earliestDeparture} – {p.latestDeparture}</span></p>
              <p>Poids confort/prix : <span className="text-atlas-text">{p.comfortWeight} / {p.priceWeight}</span></p>
            </div>
            {!p.isActive && (
              <form action={setActiveProfile.bind(null, p.id)} className="mt-4">
                <Button variant="ghost" type="submit" className="w-full">Activer ce profil</Button>
              </form>
            )}
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader title="À propos des profils" subtitle="Section 13 du cahier des charges" />
        <div className="space-y-2 p-5 text-xs text-atlas-muted">
          <p><strong className="text-atlas-text">FAMILLE</strong> — moins d'escales, horaires raisonnables, pénalise les longues attentes.</p>
          <p><strong className="text-atlas-text">COUPLE</strong> — équilibre entre prix et confort (profil par défaut).</p>
          <p><strong className="text-atlas-text">DEAL HUNTER</strong> — accepte plus de contraintes, priorité maximale au prix.</p>
        </div>
      </Card>
    </div>
  );
}

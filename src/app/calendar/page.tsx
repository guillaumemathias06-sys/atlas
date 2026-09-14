import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, Button, EmptyState } from "@/components/ui";
import { addCalendarBlock, deleteCalendarBlock } from "@/lib/actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-atlas-border bg-atlas-panel2 px-3 py-2 text-sm text-atlas-text outline-none focus:border-atlas-accent/60";

export default async function CalendarPage() {
  const blocks = await prisma.calendarBlock.findMany({ orderBy: { startDate: "asc" } });

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">Calendrier</h1>
      <p className="mt-1 text-sm text-atlas-muted">
        Calendrier interne (section 20) — ATLAS évite de vous proposer un voyage qui chevauche une période bloquée.
        L'intégration Google Calendar viendra plus tard ; ce calendrier simple fonctionne dès maintenant.
      </p>

      <Card className="mt-6">
        <CardHeader title="Ajouter une période" />
        <form action={addCalendarBlock} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-atlas-muted">Libellé</span>
            <input type="text" name="label" required placeholder="Ex: travail, mariage, indisponible" className={`${inputClass} mt-1`} />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-atlas-text">
            <input type="checkbox" name="blocking" defaultChecked className="accent-atlas-accent" />
            Bloquant (empêche les recommandations sur cette période)
          </label>
          <label className="block">
            <span className="text-xs font-medium text-atlas-muted">Du</span>
            <input type="date" name="startDate" required className={`${inputClass} mt-1`} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-atlas-muted">Au</span>
            <input type="date" name="endDate" required className={`${inputClass} mt-1`} />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Périodes enregistrées" subtitle={`${blocks.length} entrée(s)`} />
        {blocks.length === 0 ? (
          <div className="p-6"><EmptyState title="Aucune période enregistrée" description="Ajoutez vos indisponibilités pour qu'ATLAS en tienne compte." /></div>
        ) : (
          <div className="divide-y divide-atlas-border/60">
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-atlas-text">{b.label}</p>
                  <p className="text-xs text-atlas-muted">
                    {new Date(b.startDate).toLocaleDateString("fr-FR")} → {new Date(b.endDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={b.blocking ? "danger" : "neutral"}>{b.blocking ? "Bloquant" : "Note"}</Badge>
                  <form action={deleteCalendarBlock.bind(null, b.id)}>
                    <Button variant="ghost" type="submit" className="text-xs">Supprimer</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

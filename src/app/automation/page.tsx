import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, Button } from "@/components/ui";
import { updatePurchasePolicy } from "@/lib/actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-atlas-border bg-atlas-panel2 px-3 py-2 text-sm text-atlas-text outline-none focus:border-atlas-accent/60";

const MODE_DESCRIPTIONS: Record<string, string> = {
  OBSERVATION: "ATLAS observe et score, aucune notification particulière liée à l'achat.",
  ALERT: "ATLAS alerte quand un deal remplirait les conditions du mandat, sans action.",
  APPROVAL_REQUIRED: "ATLAS préparerait une réservation mais attendrait votre validation explicite.",
  AUTONOMOUS_PURCHASE: "ATLAS achèterait automatiquement si TOUTES les conditions sont vraies. Aucune intégration de paiement n'existe encore : ce mode ne peut avoir aucun effet réel aujourd'hui.",
};

export default async function AutomationPage() {
  const policy = await prisma.purchasePolicy.findUniqueOrThrow({ where: { id: "singleton" } });
  const recentAudit = await prisma.purchaseAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">Automation</h1>
      <p className="mt-1 text-sm text-atlas-muted">Purchase Policy Engine — architecture V2/V3, désactivée par défaut (section 21).</p>

      <Card className="mt-6 border-atlas-danger/40 bg-atlas-danger/5">
        <div className="flex items-center gap-3 p-5">
          <span className="text-2xl">⚠</span>
          <div>
            <p className="text-sm font-semibold text-atlas-text">Aucune intégration de paiement ou de réservation n'existe dans ATLAS aujourd'hui.</p>
            <p className="mt-1 text-xs text-atlas-muted">
              Le Purchase Policy Engine est une architecture déterministe préparée pour l'avenir. Le kill switch est engagé par défaut
              et le mode AUTONOMOUS_PURCHASE, même sélectionné, ne peut déclencher aucune dépense réelle tant qu'aucun provider de
              réservation/paiement n'est branché.
            </p>
          </div>
        </div>
      </Card>

      <form action={updatePurchasePolicy}>
        <Card className="mt-6">
          <CardHeader
            title="Mode & kill switch"
            right={<Badge tone={policy.killSwitchEngaged ? "good" : "danger"}>{policy.killSwitchEngaged ? "KILL SWITCH ACTIF" : "KILL SWITCH DÉSENGAGÉ"}</Badge>}
          />
          <div className="space-y-4 p-5">
            <label className="flex items-center gap-2 text-sm text-atlas-text">
              <input type="checkbox" name="killSwitchEngaged" defaultChecked={policy.killSwitchEngaged} className="accent-atlas-danger" />
              Kill switch engagé (bloque tout achat quoi qu'il arrive — recommandé de le laisser actif)
            </label>

            <div>
              <span className="text-xs font-medium text-atlas-muted">Mode</span>
              <select name="mode" defaultValue={policy.mode} className={`${inputClass} mt-1`}>
                <option value="OBSERVATION">OBSERVATION</option>
                <option value="ALERT">ALERT</option>
                <option value="APPROVAL_REQUIRED">APPROVAL_REQUIRED</option>
                <option value="AUTONOMOUS_PURCHASE">AUTONOMOUS_PURCHASE</option>
              </select>
              {Object.entries(MODE_DESCRIPTIONS).map(([mode, desc]) => (
                <p key={mode} className="mt-2 text-[11px] text-atlas-muted"><strong className="text-atlas-text">{mode}</strong> — {desc}</p>
              ))}
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="Mandat d'achat" subtitle="TOUTES les conditions doivent être vraies" />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-atlas-muted">Prix max / personne (€)</span>
              <input type="number" name="maxPricePerPersonEUR" defaultValue={policy.maxPricePerPersonEUR} className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-atlas-muted">Total réservation max (€)</span>
              <input type="number" name="maxBookingTotalEUR" defaultValue={policy.maxBookingTotalEUR} className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-atlas-muted">ATLAS Score minimum</span>
              <input type="number" name="minAtlasScore" defaultValue={policy.minAtlasScore} className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-atlas-muted">Season Score minimum</span>
              <input type="number" name="minSeasonScore" defaultValue={policy.minSeasonScore} className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-atlas-muted">Escales maximum</span>
              <input type="number" name="maxStops" defaultValue={policy.maxStops} className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-atlas-muted">Achats max / mois</span>
              <input type="number" name="maxPurchasesPerMonth" defaultValue={policy.maxPurchasesPerMonth} className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-atlas-muted">Budget mensuel max (€)</span>
              <input type="number" name="maxMonthlyBudgetEUR" defaultValue={policy.maxMonthlyBudgetEUR} className={`${inputClass} mt-1`} />
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm text-atlas-text">
              <input type="checkbox" name="requireProtectedConnection" defaultChecked={policy.requireProtectedConnection} className="accent-atlas-accent" />
              Exiger une correspondance protégée
            </label>
          </div>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit">Enregistrer le mandat</Button>
        </div>
      </form>

      <Card className="mt-6">
        <CardHeader title="Journal d'audit des décisions d'achat" />
        {recentAudit.length === 0 ? (
          <p className="p-5 text-xs text-atlas-muted">Aucune évaluation d'achat enregistrée pour l'instant.</p>
        ) : (
          <div className="space-y-2 p-5">
            {recentAudit.map((a) => (
              <div key={a.id} className="rounded-lg border border-atlas-border/60 p-3 text-xs">
                <div className="flex justify-between">
                  <Badge tone={a.decision === "APPROVED" ? "good" : "neutral"}>{a.decision}</Badge>
                  <span className="text-atlas-muted">{new Date(a.createdAt).toLocaleString("fr-FR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

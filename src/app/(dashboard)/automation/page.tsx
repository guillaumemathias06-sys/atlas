import { prisma } from "@/lib/db";
import { Card, CardHeader, Badge, Button, EmptyState } from "@/components/ui";
import { updatePurchasePolicy, recordApprovalDecision } from "@/lib/actions";
import { getEligibleCandidates } from "@/lib/purchase/candidates";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-atlas-border bg-atlas-panel2 px-3 py-2 text-sm text-atlas-text outline-none focus:border-atlas-accent/60";

const MODE_DESCRIPTIONS: Record<string, string> = {
  OBSERVATION: "ATLAS observe et score, aucune notification particulière liée à l'achat.",
  ALERT: "ATLAS alerte quand un deal remplirait les conditions du mandat, sans action.",
  APPROVAL_REQUIRED: "ATLAS préparerait une réservation mais attendrait votre validation explicite.",
  AUTONOMOUS_PURCHASE: "ATLAS achèterait automatiquement si TOUTES les conditions sont vraies. Aucune intégration de paiement n'existe encore : ce mode ne peut avoir aucun effet réel aujourd'hui.",
};

function safeJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function AutomationPage() {
  const policy = await prisma.purchasePolicy.findUniqueOrThrow({ where: { id: "singleton" } });
  const recentAudit = await prisma.purchaseAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  const candidates = await getEligibleCandidates(10);
  const eligible = candidates.filter((c) => c.decision.approved);
  const profiles = await prisma.travelProfile.findMany({ orderBy: { isBuiltIn: "desc" } });
  const allowedProfileIds = new Set(safeJsonArray(policy.allowedProfileIds));
  const allowedDestinationIatas = safeJsonArray(policy.allowedDestinationIatas).join(", ");

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
          <div className="grid grid-cols-1 gap-4 border-t border-atlas-border px-5 py-5 md:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-atlas-muted">Profils de voyage autorisés</span>
              <p className="mb-2 text-[11px] text-atlas-muted/70">Aucun coché = tous les profils autorisés</p>
              <div className="space-y-1.5">
                {profiles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm text-atlas-text">
                    <input type="checkbox" name="allowedProfileIds" value={p.id} defaultChecked={allowedProfileIds.has(p.id)} className="accent-atlas-accent" />
                    {p.name.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-atlas-muted">Destinations autorisées (IATA)</span>
              <p className="mb-1 text-[11px] text-atlas-muted/70">Vide = toutes destinations autorisées</p>
              <input type="text" name="allowedDestinationIatas" defaultValue={allowedDestinationIatas} placeholder="ex: NRT, JFK" className={inputClass} />
            </label>
          </div>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit">Enregistrer le mandat</Button>
        </div>
      </form>

      <Card className="mt-6">
        <CardHeader
          title="Candidats évalués contre le mandat"
          subtitle={`${eligible.length} deal(s) rempliraient toutes les conditions du mandat en ce moment`}
        />
        {candidates.length === 0 ? (
          <div className="p-6"><EmptyState title="Aucun deal actif à évaluer" /></div>
        ) : (
          <div className="divide-y divide-atlas-border/60">
            {candidates.map((c) => (
              <div key={c.dealId} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <a href={`/deals/${c.dealId}`} className="text-sm text-atlas-text hover:text-atlas-accent">
                    {c.originIata} → {c.destinationCity} ({c.destinationIata})
                  </a>
                  <p className="text-xs text-atlas-muted">{Math.round(c.priceEUR)}€ · ATLAS {Math.round(c.atlasScore)} · Season {Math.round(c.seasonScore)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.decision.approved ? "good" : "neutral"}>
                    {c.decision.approved ? "éligible au mandat" : `${c.decision.reasons.filter((r) => r.startsWith("REJET")).length} critère(s) manquant(s)`}
                  </Badge>
                  {c.decision.approved && policy.mode === "APPROVAL_REQUIRED" && (
                    <>
                      <form action={recordApprovalDecision.bind(null, c.dealId, "APPROVE", c.decision.reasons)}>
                        <Button variant="ghost" type="submit" className="text-xs">Approuver (simulation)</Button>
                      </form>
                      <form action={recordApprovalDecision.bind(null, c.dealId, "REJECT", c.decision.reasons)}>
                        <Button variant="ghost" type="submit" className="text-xs">Rejeter</Button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="border-t border-atlas-border px-5 py-3 text-[11px] text-atlas-muted">
          "Approuver" n'effectue aucune réservation réelle (aucune intégration de paiement n'existe) — cela enregistre
          uniquement une décision simulée dans le journal d'audit ci-dessous, pour préparer le futur flux
          APPROVAL_REQUIRED.
        </p>
      </Card>

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

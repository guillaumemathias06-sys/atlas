import { prisma } from "@/lib/db";
import { Card, CardHeader, Button, Badge } from "@/components/ui";
import { updateSettings, updateAirport } from "@/lib/actions";

export const dynamic = "force-dynamic";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-atlas-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-atlas-muted/70">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-atlas-border bg-atlas-panel2 px-3 py-2 text-sm text-atlas-text outline-none focus:border-atlas-accent/60";

function jsonToCsv(json: string): string {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.join(", ") : "";
  } catch {
    return "";
  }
}

export default async function SettingsPage() {
  const settings = await prisma.userSettings.findUniqueOrThrow({ where: { id: "singleton" } });
  const airports = await prisma.airport.findMany({ where: { isOrigin: true }, orderBy: { priority: "desc" } });

  const weightPct = (w: number) => Math.round(w * 100);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-atlas-text">Settings</h1>
      <p className="mt-1 text-sm text-atlas-muted">Tout ce qu'ATLAS utilise pour scorer et filtrer est modifiable ici, sans toucher au code.</p>

      <Card className="mt-8">
        <CardHeader title="Aéroports de départ" subtitle="Priorité, seuil d'économie, autorisation" />
        <div className="space-y-3 p-5">
          {airports.map((a) => (
            <form key={a.id} action={updateAirport} className="flex flex-wrap items-center gap-3 rounded-xl border border-atlas-border/60 p-3">
              <input type="hidden" name="id" value={a.id} />
              <div className="w-32">
                <p className="text-sm font-medium text-atlas-text">{a.iata}</p>
                <p className="text-[11px] text-atlas-muted">{a.city}</p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-atlas-muted">
                <input type="checkbox" name="allowed" defaultChecked={a.allowed} className="accent-atlas-accent" />
                autorisé
              </label>
              <label className="flex items-center gap-1.5 text-xs text-atlas-muted">
                priorité
                <input type="number" name="priority" defaultValue={a.priority} min={0} max={100} className={`${inputClass} w-16 py-1`} />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-atlas-muted">
                seuil économie (€)
                <input type="number" name="minSavingsToUseEUR" defaultValue={a.minSavingsToUseEUR} className={`${inputClass} w-20 py-1`} />
              </label>
              <Button variant="ghost" type="submit" className="ml-auto text-xs">Enregistrer</Button>
            </form>
          ))}
        </div>
      </Card>

      <form action={updateSettings}>
        <Card className="mt-6">
          <CardHeader title="Contraintes de voyage" />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <Field label="Durée de séjour maximum (jours)">
              <input type="number" name="maxTripLengthDays" defaultValue={settings.maxTripLengthDays} className={inputClass} />
            </Field>
            <Field label="Budget maximum (€)">
              <input type="number" name="maxBudgetEUR" defaultValue={settings.maxBudgetEUR} className={inputClass} />
            </Field>
            <Field label="Nombre max d'escales">
              <input type="number" name="maxStops" defaultValue={settings.maxStops} className={inputClass} />
            </Field>
            <Field label="Compagnies interdites" hint="séparées par des virgules">
              <input type="text" name="bannedAirlines" defaultValue={jsonToCsv(settings.bannedAirlines)} className={inputClass} />
            </Field>
            <Field label="Destinations prioritaires (IATA)" hint="ex: NRT, JFK">
              <input type="text" name="priorityDestinationIatas" defaultValue={jsonToCsv(settings.priorityDestinationIatas)} className={inputClass} />
            </Field>
            <Field label="Destinations interdites (IATA)">
              <input type="text" name="bannedDestinationIatas" defaultValue={jsonToCsv(settings.bannedDestinationIatas)} className={inputClass} />
            </Field>
            <Field label="Régions favorites">
              <input type="text" name="favoriteRegions" defaultValue={jsonToCsv(settings.favoriteRegions)} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="Seuils ATLAS" />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <Field label="ATLAS Score minimum pour être considéré">
              <input type="number" name="minAtlasScore" defaultValue={settings.minAtlasScore} className={inputClass} />
            </Field>
            <Field label="Season Score minimum">
              <input type="number" name="minSeasonScore" defaultValue={settings.minSeasonScore} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="Seuils d'alerte" subtitle="Score minimum pour déclencher chaque palier" />
          <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
            <Field label="Intéressant ≥">
              <input type="number" name="alertTierInterestingMin" defaultValue={settings.alertTierInterestingMin} className={inputClass} />
            </Field>
            <Field label="Bonne affaire ≥">
              <input type="number" name="alertTierGoodMin" defaultValue={settings.alertTierGoodMin} className={inputClass} />
            </Field>
            <Field label="Très grosse opportunité ≥">
              <input type="number" name="alertTierGreatMin" defaultValue={settings.alertTierGreatMin} className={inputClass} />
            </Field>
            <Field label="Exceptionnel ≥">
              <input type="number" name="alertTierExceptionalMin" defaultValue={settings.alertTierExceptionalMin} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="Pondération ATLAS Score" subtitle="En %, idéalement la somme fait 100" />
          <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
            <Field label="Fare Intelligence">
              <input type="number" name="weightFare" defaultValue={weightPct(settings.weightFare)} className={inputClass} />
            </Field>
            <Field label="Season">
              <input type="number" name="weightSeason" defaultValue={weightPct(settings.weightSeason)} className={inputClass} />
            </Field>
            <Field label="Experience">
              <input type="number" name="weightExperience" defaultValue={weightPct(settings.weightExperience)} className={inputClass} />
            </Field>
            <Field label="Flight Quality">
              <input type="number" name="weightFlight" defaultValue={weightPct(settings.weightFlight)} className={inputClass} />
            </Field>
            <Field label="Adéquation durée">
              <input type="number" name="weightDuration" defaultValue={weightPct(settings.weightDuration)} className={inputClass} />
            </Field>
            <Field label="Préférences">
              <input type="number" name="weightPreference" defaultValue={weightPct(settings.weightPreference)} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="Confort & météo" subtitle="Utilisé par le Preference Score (10% de l'ATLAS Score par défaut)" />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <Field label="Température souhaitée — min (°C)">
              <input type="number" name="preferredTempMinC" defaultValue={settings.preferredTempMinC} className={inputClass} />
            </Field>
            <Field label="Température souhaitée — max (°C)">
              <input type="number" name="preferredTempMaxC" defaultValue={settings.preferredTempMaxC} className={inputClass} />
            </Field>
            <Field label="Importance de la météo (0-100)">
              <input type="number" name="weatherImportance" min={0} max={100} defaultValue={settings.weatherImportance} className={inputClass} />
            </Field>
            <Field label="Tolérance à la pluie (0-100)" hint="100 = insensible à la pluie">
              <input type="number" name="rainTolerance" min={0} max={100} defaultValue={settings.rainTolerance} className={inputClass} />
            </Field>
            <Field label="Importance de la plage (0-100)">
              <input type="number" name="beachImportance" min={0} max={100} defaultValue={settings.beachImportance} className={inputClass} />
            </Field>
            <Field label="Bagage requis">
              <select name="requiredBaggage" defaultValue={settings.requiredBaggage} className={inputClass}>
                <option value="NONE">Aucun</option>
                <option value="CARRY_ON">Cabine</option>
                <option value="CHECKED">Soute</option>
              </select>
            </Field>
            <Field label="Classe souhaitée">
              <select name="cabinClass" defaultValue={settings.cabinClass} className={inputClass}>
                <option value="ECONOMY">Économique</option>
                <option value="PREMIUM_ECONOMY">Premium Économique</option>
                <option value="BUSINESS">Affaires</option>
                <option value="FIRST">Première</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card className="mt-6">
          <CardHeader title="Mode du moteur" />
          <div className="flex items-center gap-3 p-5">
            <label className="flex items-center gap-2 text-sm text-atlas-text">
              <input type="checkbox" name="simulationMode" defaultChecked={settings.simulationMode} className="accent-atlas-accent" />
              Mode simulation (mock, sans clé API)
            </label>
            {!process.env.DUFFEL_API_KEY && <Badge tone="warn">Aucun provider réel configuré</Badge>}
          </div>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit">Enregistrer les réglages</Button>
        </div>
      </form>
    </div>
  );
}

"use server";
// Server Actions — mutations déclenchées depuis l'UI (App Router).
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { planScans } from "@/lib/engine/scanPlanner";
import { runScanCycle } from "@/lib/engine/runner";

export async function runScanNow(): Promise<void> {
  const planned = await planScans(40);
  const summary = await runScanCycle(25);
  await prisma.auditLog.create({
    data: { action: "MANUAL_SCAN", metadata: JSON.stringify({ planned, summary }) },
  });
  revalidatePath("/");
  revalidatePath("/engine");
  revalidatePath("/deals");
  revalidatePath("/alerts");
  revalidatePath("/map");
}

export async function toggleEngine(enabled: boolean) {
  await prisma.userSettings.update({ where: { id: "singleton" }, data: { engineEnabled: enabled } });
  await prisma.auditLog.create({ data: { action: enabled ? "ENGINE_ENABLED" : "ENGINE_DISABLED" } });
  revalidatePath("/engine");
  revalidatePath("/");
}

export async function markAlertRead(alertId: string) {
  await prisma.alert.update({ where: { id: alertId }, data: { read: true } });
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function markAllAlertsRead() {
  await prisma.alert.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function setActiveProfile(profileId: string) {
  await prisma.travelProfile.updateMany({ data: { isActive: false }, where: {} });
  await prisma.travelProfile.update({ where: { id: profileId }, data: { isActive: true } });
  await prisma.userSettings.update({ where: { id: "singleton" }, data: { activeProfileId: profileId } });
  revalidatePath("/profiles");
  revalidatePath("/settings");
}

export async function updateSettings(formData: FormData) {
  const num = (key: string, fallback: number) => {
    const v = formData.get(key);
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };
  const jsonArrayField = (key: string) =>
    JSON.stringify(
      String(formData.get(key) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

  const existing = await prisma.userSettings.findUniqueOrThrow({ where: { id: "singleton" } });

  await prisma.userSettings.update({
    where: { id: "singleton" },
    data: {
      maxTripLengthDays: num("maxTripLengthDays", existing.maxTripLengthDays),
      maxBudgetEUR: num("maxBudgetEUR", existing.maxBudgetEUR),
      maxStops: num("maxStops", existing.maxStops),
      bannedAirlines: jsonArrayField("bannedAirlines"),
      priorityDestinationIatas: jsonArrayField("priorityDestinationIatas"),
      bannedDestinationIatas: jsonArrayField("bannedDestinationIatas"),
      favoriteRegions: jsonArrayField("favoriteRegions"),
      minAtlasScore: num("minAtlasScore", existing.minAtlasScore),
      minSeasonScore: num("minSeasonScore", existing.minSeasonScore),
      alertTierInterestingMin: num("alertTierInterestingMin", existing.alertTierInterestingMin),
      alertTierGoodMin: num("alertTierGoodMin", existing.alertTierGoodMin),
      alertTierGreatMin: num("alertTierGreatMin", existing.alertTierGreatMin),
      alertTierExceptionalMin: num("alertTierExceptionalMin", existing.alertTierExceptionalMin),
      weightFare: num("weightFare", existing.weightFare) / 100,
      weightSeason: num("weightSeason", existing.weightSeason) / 100,
      weightExperience: num("weightExperience", existing.weightExperience) / 100,
      weightFlight: num("weightFlight", existing.weightFlight) / 100,
      weightDuration: num("weightDuration", existing.weightDuration) / 100,
      weightPreference: num("weightPreference", existing.weightPreference) / 100,
      simulationMode: formData.get("simulationMode") === "on",
      maxMonthlySearchSpendEUR: num("maxMonthlySearchSpendEUR", existing.maxMonthlySearchSpendEUR),
      preferredTempMinC: num("preferredTempMinC", existing.preferredTempMinC),
      preferredTempMaxC: num("preferredTempMaxC", existing.preferredTempMaxC),
      weatherImportance: num("weatherImportance", existing.weatherImportance),
      rainTolerance: num("rainTolerance", existing.rainTolerance),
      beachImportance: num("beachImportance", existing.beachImportance),
      requiredBaggage: String(formData.get("requiredBaggage") ?? existing.requiredBaggage),
      cabinClass: String(formData.get("cabinClass") ?? existing.cabinClass),
      forbiddenHoursStart: String(formData.get("forbiddenHoursStart") ?? existing.forbiddenHoursStart),
      forbiddenHoursEnd: String(formData.get("forbiddenHoursEnd") ?? existing.forbiddenHoursEnd),
    },
  });
  await prisma.auditLog.create({ data: { action: "SETTINGS_UPDATED" } });
  revalidatePath("/settings");
}

export async function updateAirport(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.airport.update({
    where: { id },
    data: {
      allowed: formData.get("allowed") === "on",
      priority: Number(formData.get("priority") ?? 50),
      minSavingsToUseEUR: Number(formData.get("minSavingsToUseEUR") ?? 150),
    },
  });
  await prisma.auditLog.create({ data: { action: "AIRPORT_UPDATED", metadata: JSON.stringify({ id }) } });
  revalidatePath("/settings");
}

export async function updatePurchasePolicy(formData: FormData) {
  const mode = String(formData.get("mode") ?? "OBSERVATION");
  const killSwitchEngaged = formData.get("killSwitchEngaged") === "on";
  const csvToJsonArray = (key: string) =>
    JSON.stringify(String(formData.get(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const checkboxGroupToJsonArray = (key: string) => JSON.stringify(formData.getAll(key).map(String));

  await prisma.purchasePolicy.update({
    where: { id: "singleton" },
    data: {
      mode,
      killSwitchEngaged,
      maxPricePerPersonEUR: Number(formData.get("maxPricePerPersonEUR") ?? 300),
      maxBookingTotalEUR: Number(formData.get("maxBookingTotalEUR") ?? 600),
      minAtlasScore: Number(formData.get("minAtlasScore") ?? 98),
      minSeasonScore: Number(formData.get("minSeasonScore") ?? 85),
      maxStops: Number(formData.get("maxStops") ?? 1),
      requireProtectedConnection: formData.get("requireProtectedConnection") === "on",
      maxPurchasesPerMonth: Number(formData.get("maxPurchasesPerMonth") ?? 0),
      maxMonthlyBudgetEUR: Number(formData.get("maxMonthlyBudgetEUR") ?? 0),
      allowedProfileIds: checkboxGroupToJsonArray("allowedProfileIds"),
      allowedDestinationIatas: csvToJsonArray("allowedDestinationIatas"),
    },
  });
  await prisma.auditLog.create({
    data: { action: "PURCHASE_POLICY_UPDATED", metadata: JSON.stringify({ mode, killSwitchEngaged }) },
  });
  revalidatePath("/automation");
}

export async function addCalendarBlock(formData: FormData) {
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  const label = String(formData.get("label") ?? "").trim();
  const blocking = formData.get("blocking") === "on";

  if (!label || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return;

  await prisma.calendarBlock.create({ data: { startDate, endDate, label, blocking } });
  await prisma.auditLog.create({ data: { action: "CALENDAR_BLOCK_ADDED", metadata: JSON.stringify({ label }) } });
  revalidatePath("/calendar");
}

export async function deleteCalendarBlock(id: string) {
  await prisma.calendarBlock.delete({ where: { id } });
  revalidatePath("/calendar");
}

/**
 * Flux d'approbation (mode APPROVAL_REQUIRED, section 21) : enregistre une décision dans
 * le journal d'audit. Ceci NE RÉSERVE RIEN — aucune intégration de paiement n'existe.
 * C'est une trace de ce que l'utilisateur aurait approuvé, rien de plus.
 */
export async function recordApprovalDecision(dealId: string, action: "APPROVE" | "REJECT", reasons: string[]) {
  const policy = await prisma.purchasePolicy.findUniqueOrThrow({ where: { id: "singleton" } });
  const decision = action === "APPROVE" ? "SIMULATED" : "REJECTED"; // jamais "APPROVED" : aucune réservation réelle n'existe
  await prisma.purchaseAuditLog.create({
    data: { dealId, decision, reasons: JSON.stringify(reasons), mode: policy.mode },
  });
  await prisma.auditLog.create({ data: { action: "APPROVAL_DECISION", metadata: JSON.stringify({ dealId, decision }) } });
  revalidatePath("/automation");
}

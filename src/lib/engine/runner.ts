// Moteur de recherche permanente — exécution des tâches dues (section 5)
// Respecte les limitations API via une limite par cycle, gère le backoff,
// adapte la fréquence de scan selon la "promesse" de la route, journalise tout.
import { prisma } from "@/lib/db";
import { getActiveProvider } from "@/lib/providers";
import { computeFareScore } from "@/lib/scoring/fareScore";
import { computeSeasonScore } from "@/lib/scoring/seasonScore";
import { computeExperienceScore } from "@/lib/scoring/experienceScore";
import { computeFlightQualityScore } from "@/lib/scoring/flightQualityScore";
import { computePreferenceScore } from "@/lib/scoring/preferenceScore";
import { durationFitScore } from "@/lib/duration/rules";
import type { DurationRule } from "@/types";
import { computeAtlasScore, generateExplanation, applyProfileBias, type AtlasWeights } from "@/lib/scoring/atlasScore";
import { maybeCreateAlert, type AlertThresholds } from "@/lib/alerts/engine";
import { getSearchBudgetStatus } from "@/lib/engine/searchBudget";
import type { FlightOffer } from "@/types";

function safeJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeDurationRules(json: string): DurationRule[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface ScanCycleSummary {
  tasksProcessed: number;
  observationsCreated: number;
  dealsCreated: number;
  alertsCreated: number;
  errors: number;
}

export async function runScanCycle(maxTasks = 15): Promise<ScanCycleSummary> {
  const summary: ScanCycleSummary = {
    tasksProcessed: 0,
    observationsCreated: 0,
    dealsCreated: 0,
    alertsCreated: 0,
    errors: 0,
  };

  const settings = await prisma.userSettings.findUnique({ where: { id: "singleton" } });
  if (!settings || !settings.engineEnabled) return summary;

  // Plafond de dépense (docs/providers.md) : même si simulationMode=false et qu'un
  // provider réel est configuré, on retombe de force sur le mock dès que le plafond
  // mensuel serait dépassé. Cette vérification prime sur simulationMode.
  let preferReal = !settings.simulationMode;
  if (preferReal) {
    const budget = await getSearchBudgetStatus(settings.maxMonthlySearchSpendEUR);
    if (budget.budgetExceeded) {
      preferReal = false;
      // Une seule entrée d'audit par jour suffit à tracer le basculement (le cron tourne
      // plusieurs fois par heure ; pas la peine de dupliquer le même constat à chaque tick).
      const loggedToday = await prisma.auditLog.findFirst({
        where: { action: "SEARCH_BUDGET_EXCEEDED_FALLBACK_TO_MOCK", createdAt: { gte: new Date(Date.now() - 86400000) } },
      });
      if (!loggedToday) {
        await prisma.auditLog.create({
          data: { action: "SEARCH_BUDGET_EXCEEDED_FALLBACK_TO_MOCK", metadata: JSON.stringify(budget) },
        });
      }
    }
  }
  const provider = getActiveProvider(preferReal);

  // Profil de voyage actif (section 13) — module les seuils de qualité de vol et la
  // pondération ATLAS Score. Sans profil actif, comportement neutre (biais nul).
  const activeProfile = settings.activeProfileId
    ? await prisma.travelProfile.findUnique({ where: { id: settings.activeProfileId } })
    : null;

  const durationRules = safeDurationRules(settings.durationRules);
  const baseWeights: AtlasWeights = {
    weightFare: settings.weightFare,
    weightSeason: settings.weightSeason,
    weightExperience: settings.weightExperience,
    weightFlight: settings.weightFlight,
    weightDuration: settings.weightDuration,
    weightPreference: settings.weightPreference,
  };
  const weights = activeProfile
    ? applyProfileBias(baseWeights, activeProfile.comfortWeight, activeProfile.priceWeight)
    : baseWeights;
  const thresholds: AlertThresholds = {
    interesting: settings.alertTierInterestingMin,
    good: settings.alertTierGoodMin,
    great: settings.alertTierGreatMin,
    exceptional: settings.alertTierExceptionalMin,
  };
  const bannedDestinations = safeJsonArray(settings.bannedDestinationIatas);
  const priorityDestinations = safeJsonArray(settings.priorityDestinationIatas);
  const favoriteRegions = safeJsonArray(settings.favoriteRegions);
  const bannedAirlines = safeJsonArray(settings.bannedAirlines);

  const now = new Date();
  const tasks = await prisma.searchTask.findMany({
    where: { status: "PENDING", nextRunAt: { lte: now } },
    orderBy: [{ priority: "desc" }, { nextRunAt: "asc" }],
    take: maxTasks,
    include: { origin: true, destination: true },
  });

  for (const task of tasks) {
    summary.tasksProcessed++;

    if (bannedDestinations.includes(task.destination.iata)) {
      await prisma.searchTask.update({
        where: { id: task.id },
        data: { status: "DONE" },
      });
      continue;
    }

    await prisma.searchTask.update({ where: { id: task.id }, data: { status: "RUNNING" } });
    const startedAt = Date.now();

    try {
      const result = await provider.search({
        originIata: task.origin.iata,
        destinationIata: task.destination.iata,
        departDate: task.departDate.toISOString().slice(0, 10),
        returnDate: task.returnDate.toISOString().slice(0, 10),
      });

      const best: FlightOffer | undefined = result.offers[0];
      if (!best) throw new Error("Aucune offre retournée par le provider");

      const observation = await prisma.priceObservation.create({
        data: {
          taskId: task.id,
          originId: task.originId,
          destinationId: task.destinationId,
          departDate: task.departDate,
          returnDate: task.returnDate,
          tripLengthDays: task.tripLengthDays,
          priceEUR: best.priceEUR,
          currency: best.currency,
          airline: best.airline,
          stops: best.stops,
          totalDurationMinutes: best.totalDurationMinutes,
          outboundDurationMinutes: best.outboundDurationMinutes,
          inboundDurationMinutes: best.inboundDurationMinutes,
          layoverMinutes: best.layoverMinutes,
          baggageIncluded: best.baggageIncluded,
          cabinClass: best.cabinClass,
          selfTransfer: best.selfTransfer,
          provider: best.provider,
          raw: JSON.stringify(result.offers.slice(0, 5)),
        },
      });
      summary.observationsCreated++;

      // --- Historique pour Fare Score ---
      const historical = await prisma.priceObservation.findMany({
        where: {
          originId: task.originId,
          destinationId: task.destinationId,
          id: { not: observation.id },
        },
        select: { priceEUR: true },
        orderBy: { observedAt: "desc" },
        take: 200,
      });
      const fare = computeFareScore({
        currentPrice: best.priceEUR,
        historicalPrices: historical.map((h) => h.priceEUR),
      });

      // --- Season + Experience via DestinationProfile ---
      const destProfile = await prisma.destinationProfile.findUnique({
        where: { iata: task.destination.iata },
        include: { seasonMonths: true, events: true },
      });
      const departMonth = task.departDate.getMonth() + 1;
      const seasonMonth = destProfile?.seasonMonths.find((s) => s.month === departMonth) ?? null;
      const season = computeSeasonScore(seasonMonth);

      const experience = computeExperienceScore(
        departMonth,
        task.departDate.getDate(),
        task.returnDate.getMonth() + 1,
        task.returnDate.getDate(),
        destProfile?.events ?? []
      );

      // --- Flight Quality ---
      const bestKnown = await prisma.priceObservation.aggregate({
        where: { originId: task.originId, destinationId: task.destinationId },
        _min: { totalDurationMinutes: true },
      });
      const flight = computeFlightQualityScore({
        stops: best.stops,
        totalDurationMinutes: best.totalDurationMinutes,
        bestKnownDurationMinutes: bestKnown._min.totalDurationMinutes ?? best.totalDurationMinutes,
        departTime: best.departTime,
        arriveTime: best.arriveTime,
        selfTransfer: best.selfTransfer,
        baggageIncluded: best.baggageIncluded,
        earliestDeparture: activeProfile?.earliestDeparture,
        latestDeparture: activeProfile?.latestDeparture,
        maxStopsPreferred: activeProfile?.maxStops ?? settings.maxStops,
        selfTransferAllowed: activeProfile?.maxSelfTransfer,
        layoverMinutes: best.layoverMinutes,
        minLayoverMinutes: activeProfile?.minLayoverMinutes,
        maxLayoverMinutes: activeProfile?.maxLayoverMinutes,
        penalizeLongLayover: activeProfile?.penalizeLongLayover,
        forbiddenHoursStart: settings.forbiddenHoursStart,
        forbiddenHoursEnd: settings.forbiddenHoursEnd,
      });

      // --- Duration fit ---
      const totalTravelHours = best.totalDurationMinutes / 60;
      const durFit = durationFitScore(totalTravelHours, task.tripLengthDays, durationRules.length ? durationRules : undefined);

      // --- Preference (destinations/compagnies/escales + confort météo/plage/bagages/classe) ---
      const pref = computePreferenceScore({
        destinationIata: task.destination.iata,
        region: destProfile?.region,
        airline: best.airline,
        stops: best.stops,
        priorityDestinations,
        favoriteRegions,
        bannedAirlines,
        maxStopsPreference: activeProfile?.maxStops ?? settings.maxStops,
        baggageIncluded: best.baggageIncluded,
        requiredBaggage: settings.requiredBaggage,
        cabinClass: best.cabinClass,
        preferredCabinClass: settings.cabinClass,
        destinationAvgTempC: seasonMonth?.avgTempC ?? null,
        preferredTempMinC: settings.preferredTempMinC,
        preferredTempMaxC: settings.preferredTempMaxC,
        weatherImportance: settings.weatherImportance,
        destinationRainfallMm: seasonMonth?.rainfallMm ?? null,
        rainTolerance: settings.rainTolerance,
        isBeachDestination: destProfile?.isBeachDestination ?? false,
        beachImportance: settings.beachImportance,
      });

      const atlasScore = computeAtlasScore(
        {
          fareScore: fare.score,
          seasonScore: season.score,
          experienceScore: experience.score,
          flightQualityScore: flight.score,
          durationFitScore: durFit,
          preferenceScore: pref.score,
        },
        weights
      );

      const explanation = generateExplanation({
        destinationCity: task.destination.city,
        atlasScore,
        vsMedianPct: fare.vsMedianPct,
        seasonReasons: season.reasons,
        matchedEvents: experience.matchedEvents,
        flightReasons: flight.reasons,
        stops: best.stops,
        seasonScore: season.score,
        experienceScore: experience.score,
      });

      const deal = await prisma.deal.create({
        data: {
          observationId: observation.id,
          fareScore: fare.score,
          seasonScore: season.score,
          experienceScore: experience.score,
          flightQualityScore: flight.score,
          durationFitScore: durFit,
          preferenceScore: pref.score,
          atlasScore,
          explanation,
          priceVsMedianPct: fare.vsMedianPct,
          priceVsAvgPct: fare.vsAvgPct,
          priceVsAllTimeLowPct: fare.vsAllTimeLowPct,
        },
      });
      summary.dealsCreated++;

      if (atlasScore >= settings.minAtlasScore && season.score >= settings.minSeasonScore) {
        const alert = await maybeCreateAlert({
          dealId: deal.id,
          destinationIata: task.destination.iata,
          originIata: task.origin.iata,
          tripLengthDays: task.tripLengthDays,
          atlasScore,
          priceEUR: best.priceEUR,
          explanation,
          thresholds,
        });
        if (alert) summary.alertsCreated++;
      }

      // --- Adaptation de fréquence : un score élevé => on scanne plus souvent la route ---
      let frequencyHours = task.frequencyHours;
      if (atlasScore >= 90) frequencyHours = Math.max(3, frequencyHours * 0.5);
      else if (atlasScore >= 75) frequencyHours = Math.max(6, frequencyHours * 0.75);
      else frequencyHours = Math.min(168, frequencyHours * 1.15); // route peu prometteuse => on ralentit

      await prisma.searchTask.update({
        where: { id: task.id },
        data: {
          status: "PENDING",
          lastRunAt: now,
          retryCount: 0,
          lastError: null,
          frequencyHours,
          nextRunAt: new Date(now.getTime() + frequencyHours * 60 * 60 * 1000),
        },
      });

      await prisma.scanLog.create({
        data: {
          taskId: task.id,
          provider: provider.name,
          success: true,
          durationMs: Date.now() - startedAt,
          message: `${task.origin.iata}->${task.destination.iata} ${best.priceEUR}€ ATLAS ${atlasScore}`,
        },
      });
    } catch (err) {
      summary.errors++;
      const message = err instanceof Error ? err.message : String(err);
      const retryCount = task.retryCount + 1;
      const backoffHours = Math.min(48, Math.pow(2, retryCount)); // backoff exponentiel plafonné

      await prisma.searchTask.update({
        where: { id: task.id },
        data: {
          status: "PENDING",
          retryCount,
          lastError: message,
          nextRunAt: new Date(now.getTime() + backoffHours * 60 * 60 * 1000),
        },
      });

      await prisma.scanLog.create({
        data: {
          taskId: task.id,
          provider: provider.name,
          success: false,
          durationMs: Date.now() - startedAt,
          message,
        },
      });
    }
  }

  return summary;
}

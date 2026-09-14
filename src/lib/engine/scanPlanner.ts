// Moteur de recherche permanente — planification des tâches (section 5)
// Crée les combinaisons origine × destination × dates à scanner, évite les
// doublons, attribue une priorité de départ.
import { prisma } from "@/lib/db";
import { minStayDaysFor } from "@/lib/duration/rules";

// Toutes les dates de voyage sont normalisées en UTC (jamais en heure locale du serveur) :
// UserSettings.durationRules, CalendarBlock et le formulaire <input type="date"> sont tous
// parsés/produits en UTC. Mélanger UTC et heure locale créerait un décalage silencieux de
// quelques heures près des limites de journée, faussant la détection de conflit calendrier.
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Estimation grossière du temps de trajet total (heures) à partir d'une distance connue/absente :
// utilisée uniquement pour la planification (durée mini de séjour) avant la première observation réelle.
function estimateTravelHours(originPriorityDistanceKm: number | null, destPriorityDistanceKm: number | null): number {
  // Heuristique de planification : sans donnée, on suppose moyen-courrier (5h) pour rester raisonnable.
  const combined = (originPriorityDistanceKm ?? 0) + (destPriorityDistanceKm ?? 0);
  if (combined === 0) return 5;
  return Math.max(1.5, Math.min(16, combined / 900));
}

export async function planScans(maxNewTasks = 60): Promise<{ created: number }> {
  const origins = await prisma.airport.findMany({ where: { isOrigin: true, allowed: true } });
  const destinations = await prisma.airport.findMany({ where: { isDestinationOk: true, allowed: true } });

  if (origins.length === 0 || destinations.length === 0) return { created: 0 };

  let created = 0;
  const now = new Date();

  outer: for (const origin of origins) {
    for (const destination of destinations) {
      if (destination.iata === origin.iata) continue;
      if (created >= maxNewTasks) break outer;

      const travelHours = estimateTravelHours(origin.distanceFromHomeKm, destination.distanceFromHomeKm);
      const minStay = minStayDaysFor(travelHours);
      const tripLengthDays = minStay * 2; // durée "idéale" par défaut pour la première planification

      // 3 fenêtres de départ échelonnées dans le temps pour couvrir plusieurs saisons proches
      const departOffsets = [30, 75, 150];

      for (const offsetDays of departOffsets) {
        const departDate = addDays(now, offsetDays);
        departDate.setUTCHours(0, 0, 0, 0);
        const returnDate = addDays(departDate, tripLengthDays);

        const existing = await prisma.searchTask.findFirst({
          where: {
            originId: origin.id,
            destinationId: destination.id,
            departDate,
            returnDate,
          },
        });
        if (existing) continue;

        const priority = Math.round((origin.priority + destination.priority) / 2);

        await prisma.searchTask.create({
          data: {
            originId: origin.id,
            destinationId: destination.id,
            departDate,
            returnDate,
            tripLengthDays,
            priority,
            frequencyHours: 24,
            nextRunAt: now,
          },
        });
        created++;
        if (created >= maxNewTasks) break outer;
      }
    }
  }

  await prisma.auditLog.create({
    data: { action: "PLAN_SCANS", metadata: JSON.stringify({ created }) },
  });

  return { created };
}

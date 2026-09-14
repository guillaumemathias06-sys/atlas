// Experience Intelligence (section 9) — événements exceptionnels par destination
import { clamp } from "@/lib/utils/stats";

export interface DestinationEventData {
  name: string;
  typicalStartMonth: number;
  typicalStartDay: number;
  typicalEndMonth: number;
  typicalEndDay: number;
  dateVariability: string; // "LOW" | "MEDIUM" | "HIGH", tolère toute valeur (fallback MEDIUM)
  importance: number; // 0-100
  potentialScore: number; // score max si alignement parfait
}

function dayOfYear(month: number, day: number): number {
  return month * 31 + day; // approximation suffisante pour comparer des plages
}

/** true si [start,end] (jour de l'année d'un événement, avec tolérance) chevauche la fenêtre du voyage */
function overlaps(tripStart: number, tripEnd: number, evStart: number, evEnd: number, toleranceDays: number): boolean {
  return tripStart - toleranceDays <= evEnd && tripEnd + toleranceDays >= evStart;
}

export function computeExperienceScore(
  tripDepartMonth: number,
  tripDepartDay: number,
  tripReturnMonth: number,
  tripReturnDay: number,
  events: DestinationEventData[]
): { score: number; matchedEvents: string[] } {
  if (!events.length) return { score: 30, matchedEvents: [] }; // pas d'événement connu = score bas mais pas nul

  const tripStart = dayOfYear(tripDepartMonth, tripDepartDay);
  const tripEnd = dayOfYear(tripReturnMonth, tripReturnDay);

  let best = 0;
  const matched: string[] = [];

  for (const ev of events) {
    const evStart = dayOfYear(ev.typicalStartMonth, ev.typicalStartDay);
    const evEnd = dayOfYear(ev.typicalEndMonth, ev.typicalEndDay);
    const tolerance = ev.dateVariability === "HIGH" ? 15 : ev.dateVariability === "MEDIUM" ? 8 : 3;

    if (overlaps(tripStart, tripEnd, evStart, evEnd, tolerance)) {
      const weighted = ev.potentialScore * (0.5 + (ev.importance / 100) * 0.5);
      if (weighted > best) best = weighted;
      matched.push(ev.name);
    }
  }

  if (matched.length === 0) return { score: 30, matchedEvents: [] };
  return { score: clamp(Math.round(best), 0, 100), matchedEvents: matched };
}

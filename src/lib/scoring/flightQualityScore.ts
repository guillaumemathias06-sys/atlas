// Flight Quality Score (section 10)
// Les seuils (horaires, escales tolérées, sévérité du self-transfer) sont dérivés du
// profil de voyage actif (section 13) quand il est fourni — FAMILLE et DEAL HUNTER
// n'évaluent pas un même vol de la même façon. Des valeurs par défaut raisonnables
// s'appliquent si aucun profil n'est actif.
import { clamp } from "@/lib/utils/stats";

export interface FlightQualityInput {
  stops: number;
  totalDurationMinutes: number;
  bestKnownDurationMinutes: number; // meilleur trajet connu sur la route (pour comparaison)
  departTime: string; // HH:mm
  arriveTime: string; // HH:mm
  selfTransfer: boolean;
  baggageIncluded: boolean;
  airportChange?: boolean;
  layoverMinutes?: number; // durée cumulée des escales, 0 si vol direct

  // Dérivés du profil de voyage actif — valeurs par défaut si aucun profil.
  earliestDeparture?: string; // HH:mm, défaut "06:00"
  latestDeparture?: string; // HH:mm, défaut "22:00"
  maxStopsPreferred?: number; // défaut 2 — au-delà, pénalité supplémentaire par escale
  selfTransferAllowed?: boolean; // défaut true ; false (ex. profil FAMILLE) amplifie la pénalité
  minLayoverMinutes?: number; // défaut 0 — en dessous, correspondance jugée trop courte/risquée
  maxLayoverMinutes?: number; // défaut illimité — au-dessus, attente jugée trop longue
  penalizeLongLayover?: boolean; // défaut true

  // Dérivés des préférences globales (section 14 : "horaires interdits")
  forbiddenHoursStart?: string; // HH:mm
  forbiddenHoursEnd?: string; // HH:mm — la fenêtre peut chevaucher minuit (ex. 23:00 -> 05:00)
}

function hourOf(hhmm: string): number {
  const parts = hhmm.split(":");
  return Number(parts[0] ?? 0);
}

/** true si `hour` tombe dans la fenêtre [start, end), avec prise en charge du passage minuit. */
function isWithinForbiddenWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return false; // fenêtre nulle = pas de restriction
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end; // fenêtre traversant minuit
}

export function computeFlightQualityScore(input: FlightQualityInput): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];

  const maxStopsPreferred = input.maxStopsPreferred ?? 2;
  const earliestDeparture = hourOf(input.earliestDeparture ?? "06:00");
  const latestDeparture = hourOf(input.latestDeparture ?? "22:00");
  const selfTransferAllowed = input.selfTransferAllowed ?? true;

  // Escales
  if (input.stops === 1) {
    score -= 10;
  } else if (input.stops >= 2) {
    score -= 10 + (input.stops - 1) * 15;
    reasons.push(`${input.stops} escales`);
  }
  if (input.stops > maxStopsPreferred) {
    score -= (input.stops - maxStopsPreferred) * 10;
    reasons.push("plus d'escales que ne le tolère votre profil de voyage");
  }

  // Durée vs meilleur trajet connu
  if (input.bestKnownDurationMinutes > 0) {
    const extraRatio = (input.totalDurationMinutes - input.bestKnownDurationMinutes) / input.bestKnownDurationMinutes;
    if (extraRatio > 0.15) {
      const penalty = clamp(extraRatio * 60, 0, 35);
      score -= penalty;
      reasons.push("trajet nettement plus long que le meilleur itinéraire connu");
    }
  }

  // Trajet excessivement long en absolu (>30h) — pénalité forte quel que soit le prix
  if (input.totalDurationMinutes > 30 * 60) {
    score -= 25;
    reasons.push("trajet total supérieur à 30h");
  }

  // Horaires — fenêtre acceptable dérivée du profil actif
  const depH = hourOf(input.departTime);
  const arrH = hourOf(input.arriveTime);
  if (depH < earliestDeparture || depH >= latestDeparture) {
    score -= 8;
    reasons.push("départ hors de la plage horaire de votre profil");
  }
  if (arrH >= 23 || arrH < 5) {
    score -= 8;
    reasons.push("arrivée tardive/nocturne");
  }

  // Correspondance non protégée — pénalité amplifiée si le profil actif l'interdit
  if (input.selfTransfer) {
    score -= selfTransferAllowed ? 20 : 40;
    reasons.push(
      selfTransferAllowed
        ? "correspondance non protégée (self-transfer)"
        : "correspondance non protégée — non tolérée par votre profil de voyage"
    );
  }

  if (input.airportChange) {
    score -= 10;
    reasons.push("changement d'aéroport lors de l'escale");
  }

  // Durée d'escale — seuils dérivés du profil actif
  const layoverMinutes = input.layoverMinutes ?? 0;
  if (input.stops > 0 && layoverMinutes > 0) {
    const minLayover = input.minLayoverMinutes ?? 0;
    const maxLayover = input.maxLayoverMinutes ?? Infinity;
    const penalizeLong = input.penalizeLongLayover ?? true;
    if (layoverMinutes < minLayover) {
      score -= 12;
      reasons.push("correspondance jugée trop courte pour votre profil");
    } else if (penalizeLong && layoverMinutes > maxLayover) {
      const overrun = layoverMinutes - maxLayover;
      score -= clamp(overrun / 15, 0, 20); // -1 point / 15min au-delà, plafonné à 20
      reasons.push("attente en escale plus longue que ne le tolère votre profil");
    }
  }

  // Horaires interdits (section 14) — s'applique en plus de la fenêtre de profil
  const forbiddenStart = input.forbiddenHoursStart ? hourOf(input.forbiddenHoursStart) : null;
  const forbiddenEnd = input.forbiddenHoursEnd ? hourOf(input.forbiddenHoursEnd) : null;
  if (forbiddenStart !== null && forbiddenEnd !== null) {
    if (isWithinForbiddenWindow(depH, forbiddenStart, forbiddenEnd) || isWithinForbiddenWindow(arrH, forbiddenStart, forbiddenEnd)) {
      score -= 15;
      reasons.push("horaire dans votre plage interdite");
    }
  }

  if (!input.baggageIncluded) {
    score -= 5;
    reasons.push("bagage non inclus");
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

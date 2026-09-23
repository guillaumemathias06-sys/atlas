// Flight Quality Score (section 10)
// Un bon deal est un aller-retour, pas juste un bel aller (section 25) : les deux
// tronçons sont évalués séparément, et le score global retient le PIRE des deux — un
// retour pénible ne doit jamais être masqué par un aller impeccable.
// Les seuils (horaires, escales tolérées, sévérité du self-transfer) sont dérivés du
// profil de voyage actif (section 13) quand il est fourni — FAMILLE et DEAL HUNTER
// n'évaluent pas un même vol de la même façon. Des valeurs par défaut raisonnables
// s'appliquent si aucun profil n'est actif.
import { clamp } from "@/lib/utils/stats";

export interface FlightLegInput {
  stops: number;
  departTime: string; // HH:mm
  arriveTime: string; // HH:mm
  selfTransfer: boolean;
  layoverMinutes?: number; // durée cumulée des escales, 0 si vol direct
  airportChange?: boolean;
}

export interface FlightQualityInput {
  outbound: FlightLegInput;
  returnLeg: FlightLegInput;
  totalDurationMinutes: number; // durée de l'aller (voir docs/scoring.md — sémantique historique)
  bestKnownDurationMinutes: number; // meilleur trajet aller connu sur la route (pour comparaison)
  baggageIncluded: boolean;

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

interface LegRules {
  maxStopsPreferred: number;
  earliestDeparture: number;
  latestDeparture: number;
  selfTransferAllowed: boolean;
  minLayoverMinutes: number;
  maxLayoverMinutes: number;
  penalizeLongLayover: boolean;
  forbiddenStart: number | null;
  forbiddenEnd: number | null;
}

/** Évalue UN tronçon (aller ou retour) selon les mêmes règles. */
function evaluateLeg(leg: FlightLegInput, rules: LegRules, label: "Aller" | "Retour"): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];
  const tag = (s: string) => `${label} : ${s}`;

  if (leg.stops === 1) {
    score -= 10;
  } else if (leg.stops >= 2) {
    score -= 10 + (leg.stops - 1) * 15;
    reasons.push(tag(`${leg.stops} escales`));
  }
  if (leg.stops > rules.maxStopsPreferred) {
    score -= (leg.stops - rules.maxStopsPreferred) * 10;
    reasons.push(tag("plus d'escales que ne le tolère votre profil de voyage"));
  }

  const depH = hourOf(leg.departTime);
  const arrH = hourOf(leg.arriveTime);
  if (depH < rules.earliestDeparture || depH >= rules.latestDeparture) {
    score -= 8;
    reasons.push(tag("départ hors de la plage horaire de votre profil"));
  }
  if (arrH >= 23 || arrH < 5) {
    score -= 8;
    reasons.push(tag("arrivée tardive/nocturne"));
  }

  if (leg.selfTransfer) {
    score -= rules.selfTransferAllowed ? 20 : 40;
    reasons.push(tag(rules.selfTransferAllowed ? "correspondance non protégée (self-transfer)" : "correspondance non protégée — non tolérée par votre profil"));
  }

  if (leg.airportChange) {
    score -= 10;
    reasons.push(tag("changement d'aéroport lors de l'escale"));
  }

  const layoverMinutes = leg.layoverMinutes ?? 0;
  if (leg.stops > 0 && layoverMinutes > 0) {
    if (layoverMinutes < rules.minLayoverMinutes) {
      score -= 12;
      reasons.push(tag("correspondance jugée trop courte pour votre profil"));
    } else if (rules.penalizeLongLayover && layoverMinutes > rules.maxLayoverMinutes) {
      const overrun = layoverMinutes - rules.maxLayoverMinutes;
      score -= clamp(overrun / 15, 0, 20);
      reasons.push(tag("attente en escale plus longue que ne le tolère votre profil"));
    }
  }

  if (rules.forbiddenStart !== null && rules.forbiddenEnd !== null) {
    if (isWithinForbiddenWindow(depH, rules.forbiddenStart, rules.forbiddenEnd) || isWithinForbiddenWindow(arrH, rules.forbiddenStart, rules.forbiddenEnd)) {
      score -= 15;
      reasons.push(tag("horaire dans votre plage interdite"));
    }
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

export function computeFlightQualityScore(input: FlightQualityInput): { score: number; reasons: string[] } {
  const rules: LegRules = {
    maxStopsPreferred: input.maxStopsPreferred ?? 2,
    earliestDeparture: hourOf(input.earliestDeparture ?? "06:00"),
    latestDeparture: hourOf(input.latestDeparture ?? "22:00"),
    selfTransferAllowed: input.selfTransferAllowed ?? true,
    minLayoverMinutes: input.minLayoverMinutes ?? 0,
    maxLayoverMinutes: input.maxLayoverMinutes ?? Infinity,
    penalizeLongLayover: input.penalizeLongLayover ?? true,
    forbiddenStart: input.forbiddenHoursStart ? hourOf(input.forbiddenHoursStart) : null,
    forbiddenEnd: input.forbiddenHoursEnd ? hourOf(input.forbiddenHoursEnd) : null,
  };

  const outboundEval = evaluateLeg(input.outbound, rules, "Aller");
  const returnEval = evaluateLeg(input.returnLeg, rules, "Retour");

  // Le pire des deux tronçons gouverne le score de base : un excellent aller ne compense
  // jamais un mauvais retour (demande explicite, section 25 — "un bon deal est un A/R").
  const worseIsReturn = returnEval.score <= outboundEval.score;
  let score = Math.min(outboundEval.score, returnEval.score);
  // On garde trace du tronçon fautif (raisons complètes) + un résumé du tronçon correct,
  // pour ne jamais perdre l'info "pourquoi" (section 11 : jamais un chiffre seul).
  const reasons = [...(worseIsReturn ? returnEval.reasons : outboundEval.reasons)];
  const betterEval = worseIsReturn ? outboundEval : returnEval;
  if (betterEval.reasons.length > 0) reasons.push(...betterEval.reasons);

  // Pénalités globales, non spécifiques à un tronçon.
  if (input.bestKnownDurationMinutes > 0) {
    const extraRatio = (input.totalDurationMinutes - input.bestKnownDurationMinutes) / input.bestKnownDurationMinutes;
    if (extraRatio > 0.15) {
      score -= clamp(extraRatio * 60, 0, 35);
      reasons.push("trajet aller nettement plus long que le meilleur itinéraire connu");
    }
  }
  if (input.totalDurationMinutes > 30 * 60) {
    score -= 25;
    reasons.push("trajet aller supérieur à 30h");
  }
  if (!input.baggageIncluded) {
    score -= 5;
    reasons.push("bagage non inclus");
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

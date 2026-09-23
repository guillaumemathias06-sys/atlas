// Provider Duffel — intégration réelle (Phase 5, section 5).
// Structure de réponse validée empiriquement contre l'API Duffel v2 (POST
// /air/offer_requests?return_offers=true) avant d'écrire cet adaptateur.
// Documentation : https://duffel.com/docs/api
import type { CabinClass, FlightOffer, FlightProvider, FlightSearchQuery, FlightSearchResult } from "@/types";

const DUFFEL_API_BASE = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

// --- Types minimaux de la réponse Duffel (seuls les champs utilisés) ---
interface DuffelBaggage {
  type: string; // "checked" | "carry_on"
  quantity: number;
}
interface DuffelPassengerFare {
  cabin_class: string; // "economy" | "premium_economy" | "business" | "first"
  baggages: DuffelBaggage[];
}
interface DuffelSegment {
  departing_at: string; // "2026-11-15T10:50:00"
  arriving_at: string;
  duration: string; // ISO8601, ex "PT7H58M"
  passengers: DuffelPassengerFare[];
}
interface DuffelSlice {
  duration: string; // ISO8601, durée totale du tronçon (vol + escales)
  segments: DuffelSegment[];
}
interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  owner: { name: string };
  slices: DuffelSlice[];
}
interface DuffelOfferRequestResponse {
  data?: { offers: DuffelOffer[] };
  errors?: Array<{ title?: string; message?: string; code?: string }>;
}

/** Parse une durée ISO8601 simple (PT#H#M#S) en minutes. Pas de gestion des jours (P#D). */
export function parseIso8601DurationMinutes(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 60 + minutes + Math.round(seconds / 60);
}

function hhmm(isoDateTime: string): string {
  // "2026-11-15T10:50:00" -> "10:50"
  const match = /T(\d{2}:\d{2})/.exec(isoDateTime);
  return match?.[1] ?? "00:00";
}

const CABIN_MAP: Record<string, CabinClass> = {
  economy: "ECONOMY",
  premium_economy: "PREMIUM_ECONOMY",
  business: "BUSINESS",
  first: "FIRST",
};

/** Calcule stops/durée/escale/horaires pour UN tronçon (aller ou retour). */
function sliceStats(slice: DuffelSlice) {
  const firstSeg = slice.segments[0]!;
  const lastSeg = slice.segments[slice.segments.length - 1]!;
  const totalMinutes = parseIso8601DurationMinutes(slice.duration);
  const segmentsSumMinutes = slice.segments.reduce((sum, s) => sum + parseIso8601DurationMinutes(s.duration), 0);
  const layoverMinutes = Math.max(0, totalMinutes - segmentsSumMinutes);
  return { stops: slice.segments.length - 1, totalMinutes, layoverMinutes, departTime: hhmm(firstSeg.departing_at), arriveTime: hhmm(lastSeg.arriving_at), firstSeg };
}

/**
 * Convertit une offre Duffel en FlightOffer ATLAS. Un bon deal est un aller-retour : les
 * deux tronçons sont évalués indépendamment (section 25 — "comprendre pourquoi ATLAS
 * recommande ou rejette"), pas seulement l'aller.
 */
export function mapDuffelOffer(offer: DuffelOffer): FlightOffer | null {
  const outboundSlice = offer.slices[0];
  if (!outboundSlice || outboundSlice.segments.length === 0) return null;
  const outbound = sliceStats(outboundSlice);

  const returnSlice = offer.slices[1];
  // Un tronçon retour absent (recherche one-way) retombe sur les valeurs de l'aller plutôt
  // que d'inventer un retour arbitraire — ATLAS ne fait aujourd'hui que des recherches A/R.
  const inbound = returnSlice && returnSlice.segments.length > 0 ? sliceStats(returnSlice) : outbound;

  const pax = outbound.firstSeg.passengers[0];
  const baggageIncluded = pax?.baggages?.some((b) => b.type === "checked" && b.quantity > 0) ?? false;
  const cabinClass = CABIN_MAP[pax?.cabin_class ?? "economy"] ?? "ECONOMY";

  return {
    priceEUR: Number(offer.total_amount),
    currency: offer.total_currency,
    airline: offer.owner.name,
    provider: "duffel",
    baggageIncluded,
    cabinClass,

    stops: outbound.stops,
    totalDurationMinutes: outbound.totalMinutes,
    outboundDurationMinutes: outbound.totalMinutes,
    layoverMinutes: outbound.layoverMinutes,
    // Duffel vend des correspondances protégées sur une même offre — pas de self-transfer
    // (billets séparés) dans ce flux, aller comme retour. Voir docs/providers.md.
    selfTransfer: false,
    departTime: outbound.departTime,
    arriveTime: outbound.arriveTime,

    returnStops: inbound.stops,
    inboundDurationMinutes: inbound.totalMinutes,
    returnLayoverMinutes: inbound.layoverMinutes,
    returnSelfTransfer: false,
    returnDepartTime: inbound.departTime,
    returnArriveTime: inbound.arriveTime,
  };
}

export class DuffelFlightProvider implements FlightProvider {
  readonly name = "duffel";
  constructor(private readonly apiKey: string) {}

  async search(query: FlightSearchQuery): Promise<FlightSearchResult> {
    const slices = [{ origin: query.originIata, destination: query.destinationIata, departure_date: query.departDate }];
    if (query.returnDate) {
      slices.push({ origin: query.destinationIata, destination: query.originIata, departure_date: query.returnDate });
    }

    const res = await fetch(`${DUFFEL_API_BASE}/air/offer_requests?return_offers=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Duffel-Version": DUFFEL_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers: [{ type: "adult" }],
          cabin_class: (query.cabinClass ?? "ECONOMY").toLowerCase(),
        },
      }),
    });

    const body = (await res.json()) as DuffelOfferRequestResponse;

    if (!res.ok || body.errors) {
      const message = body.errors?.[0]?.message ?? body.errors?.[0]?.title ?? `Duffel HTTP ${res.status}`;
      throw new Error(`Duffel: ${message}`);
    }

    const offers = (body.data?.offers ?? [])
      .map(mapDuffelOffer)
      .filter((o): o is FlightOffer => o !== null)
      .sort((a, b) => a.priceEUR - b.priceEUR)
      .slice(0, 8); // on ne garde que les meilleures offres, pas les centaines renvoyées

    return { query, offers, searchedAt: new Date().toISOString() };
  }
}

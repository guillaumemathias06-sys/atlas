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

/**
 * Convertit une offre Duffel en FlightOffer ATLAS. Sémantique alignée sur le provider
 * mock : les champs de durée/horaires/escales portent sur le tronçon ALLER uniquement
 * (slices[0]) — cohérent avec les règles de durée intelligente (section 4) qui évaluent
 * le temps de trajet pour REJOINDRE la destination, pas le total aller-retour cumulé.
 */
export function mapDuffelOffer(offer: DuffelOffer): FlightOffer | null {
  const outbound = offer.slices[0];
  if (!outbound || outbound.segments.length === 0) return null;

  const firstSeg = outbound.segments[0]!;
  const lastSeg = outbound.segments[outbound.segments.length - 1]!;
  const outboundMinutes = parseIso8601DurationMinutes(outbound.duration);
  const segmentsSumMinutes = outbound.segments.reduce((sum, s) => sum + parseIso8601DurationMinutes(s.duration), 0);
  const layoverMinutes = Math.max(0, outboundMinutes - segmentsSumMinutes);

  const inbound = offer.slices[1];
  const inboundMinutes = inbound ? parseIso8601DurationMinutes(inbound.duration) : outboundMinutes;

  const pax = firstSeg.passengers[0];
  const baggageIncluded = pax?.baggages?.some((b) => b.type === "checked" && b.quantity > 0) ?? false;
  const cabinClass = CABIN_MAP[pax?.cabin_class ?? "economy"] ?? "ECONOMY";

  return {
    priceEUR: Number(offer.total_amount),
    currency: offer.total_currency,
    airline: offer.owner.name,
    stops: outbound.segments.length - 1,
    totalDurationMinutes: outboundMinutes,
    outboundDurationMinutes: outboundMinutes,
    inboundDurationMinutes: inboundMinutes,
    layoverMinutes,
    baggageIncluded,
    cabinClass,
    // Duffel vend des correspondances protégées sur une même offre — pas de self-transfer
    // (billets séparés) dans ce flux. Voir docs/providers.md pour l'évolution future.
    selfTransfer: false,
    departTime: hhmm(firstSeg.departing_at),
    arriveTime: hhmm(lastSeg.arriving_at),
    provider: "duffel",
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

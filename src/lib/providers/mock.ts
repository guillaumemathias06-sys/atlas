// Provider MOCK — génère des offres de vol réalistes sans aucune clé API.
// Objectif (section 26) : permettre de développer/tester tout ATLAS sans
// dépendre d'un fournisseur payant. Le mock injecte volontairement des
// "anomalies tarifaires" pour certaines routes de démonstration afin que le
// scoring produise des cas Tokyo exceptionnel / Bali mauvais mois / etc.
import type { FlightOffer, FlightProvider, FlightSearchQuery, FlightSearchResult, CabinClass } from "@/types";

const AIRLINES = [
  "Air France", "KLM", "Lufthansa", "ITA Airways", "Swiss", "Turkish Airlines",
  "Emirates", "Qatar Airways", "ANA", "JAL", "Finnair", "Norwegian", "easyJet", "Vueling",
];

// Hash déterministe simple (pour que les prix soient stables entre deux runs proches
// mais varient dans le temps via une composante temporelle).
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Distance approximative (km) entre deux aéroports connus, utilisée pour calibrer le prix de base. */
const BASE_DISTANCE_KM: Record<string, number> = {
  "NCE-FCO": 700, "NCE-JFK": 6900, "NCE-NRT": 9700, "NCE-DPS": 12200, "NCE-BKK": 9600,
  "MXP-BKK": 9200, "MXP-JFK": 6700, "MXP-NRT": 9500, "LIN-JFK": 6700,
  "MRS-FCO": 850, "LYS-FCO": 800, "TRN-FCO": 600, "GVA-FCO": 750,
};

// Routes de démonstration avec une "anomalie" volontaire pour peupler des cas
// pédagogiques cohérents avec le cahier des charges.
const DEMO_ANOMALIES: Record<string, { multiplier: number; note: string }> = {
  "NCE-NRT": { multiplier: 0.42, note: "Erreur tarifaire / promo agressive Tokyo" }, // ~347€
  "NCE-JFK": { multiplier: 0.55, note: "Guerre tarifaire transatlantique" }, // ~249€
  "NCE-FCO": { multiplier: 1.0, note: "Tarif normal" }, // ~170€
  "NCE-DPS": { multiplier: 0.8, note: "Bon prix mais mauvaise saison (mousson)" },
  "MXP-BKK": { multiplier: 0.6, note: "Alternative Milan très compétitive" },
};

function baseDistanceKm(origin: string, destination: string): number {
  const key = `${origin}-${destination}`;
  const rev = `${destination}-${origin}`;
  return BASE_DISTANCE_KM[key] ?? BASE_DISTANCE_KM[rev] ?? 3000 + hashStr(key) % 8000;
}

function priceFromDistance(distanceKm: number, rand: () => number): number {
  // Modèle grossier : coût de base + coût au km + bruit + saisonnalité pseudo-aléatoire
  const base = 60 + distanceKm * 0.028;
  const noise = 0.75 + rand() * 0.6; // 0.75x à 1.35x
  return Math.round(base * noise);
}

export class MockFlightProvider implements FlightProvider {
  readonly name = "mock";

  async search(query: FlightSearchQuery): Promise<FlightSearchResult> {
    const { originIata, destinationIata, departDate, returnDate } = query;
    const routeKey = `${originIata}-${destinationIata}`;
    const distanceKm = baseDistanceKm(originIata, destinationIata);

    // Composante temporelle : le prix "respire" dans le temps pour simuler un marché vivant.
    const dayBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 6)); // change toutes les 6h
    const seed = hashStr(`${routeKey}-${departDate}-${returnDate}-${dayBucket}`);
    const rand = seededRandom(seed);

    const offerCount = 2 + Math.floor(rand() * 4); // 2 à 5 offres
    const offers: FlightOffer[] = [];
    const anomaly = DEMO_ANOMALIES[routeKey];

    for (let i = 0; i < offerCount; i++) {
      let price = priceFromDistance(distanceKm, rand);
      if (anomaly) price = Math.round(price * anomaly.multiplier * (0.9 + rand() * 0.2));
      // La meilleure offre (i===0) reçoit un petit bonus de rareté
      if (i === 0) price = Math.round(price * 0.94);

      const stops = distanceKm > 6000 ? Math.floor(rand() * 3) : Math.floor(rand() * 2);
      const flightDurationMinutes = Math.round((distanceKm / 800) * 60); // ~800km/h croisière
      const layoverMinutes = stops > 0 ? Math.round(60 + rand() * 300) : 0;
      const totalDurationMinutes = flightDurationMinutes + layoverMinutes;
      const selfTransfer = stops > 0 && rand() < 0.15;

      const departHour = Math.floor(rand() * 24);
      const arriveHour = (departHour + Math.floor(totalDurationMinutes / 60)) % 24;

      const cabinClasses: CabinClass[] = ["ECONOMY", "ECONOMY", "ECONOMY", "PREMIUM_ECONOMY"];
      const cabinClass = query.cabinClass ?? cabinClasses[Math.floor(rand() * cabinClasses.length)]!;

      offers.push({
        priceEUR: Math.max(29, price),
        currency: "EUR",
        airline: AIRLINES[Math.floor(rand() * AIRLINES.length)]!,
        stops,
        totalDurationMinutes,
        outboundDurationMinutes: Math.round(totalDurationMinutes * 0.5),
        inboundDurationMinutes: Math.round(totalDurationMinutes * 0.5),
        layoverMinutes,
        baggageIncluded: rand() > 0.4,
        cabinClass,
        selfTransfer,
        departTime: `${String(departHour).padStart(2, "0")}:${rand() > 0.5 ? "30" : "00"}`,
        arriveTime: `${String(arriveHour).padStart(2, "0")}:${rand() > 0.5 ? "30" : "00"}`,
        provider: this.name,
      });
    }

    offers.sort((a, b) => a.priceEUR - b.priceEUR);

    return {
      query,
      offers,
      searchedAt: new Date().toISOString(),
    };
  }
}

export const mockProvider = new MockFlightProvider();

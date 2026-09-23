// Types partagés ATLAS

export type CabinClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export interface FlightSearchQuery {
  originIata: string;
  destinationIata: string;
  departDate: string; // ISO yyyy-mm-dd
  returnDate: string; // ISO yyyy-mm-dd
  cabinClass?: CabinClass;
}

export interface FlightOffer {
  priceEUR: number; // prix TOTAL aller-retour
  currency: string;
  airline: string;
  provider: string;
  baggageIncluded: boolean;
  cabinClass: CabinClass;

  // Tronçon ALLER
  stops: number;
  totalDurationMinutes: number; // alias historique = durée du tronçon aller (voir docs/scoring.md)
  outboundDurationMinutes: number;
  layoverMinutes: number; // durée cumulée des escales à l'aller, 0 si vol direct
  selfTransfer: boolean;
  departTime: string; // HH:mm, départ à l'aller
  arriveTime: string; // HH:mm, arrivée à l'aller

  // Tronçon RETOUR — un bon deal est un aller-retour, pas juste un bel aller (section 25).
  returnStops: number;
  inboundDurationMinutes: number;
  returnLayoverMinutes: number;
  returnSelfTransfer: boolean;
  returnDepartTime: string; // HH:mm, départ au retour
  returnArriveTime: string; // HH:mm, arrivée au retour
}

export interface FlightSearchResult {
  query: FlightSearchQuery;
  offers: FlightOffer[];
  searchedAt: string;
}

/** Abstraction de fournisseur de données de vols — voir /docs/providers.md */
export interface FlightProvider {
  readonly name: string;
  search(query: FlightSearchQuery): Promise<FlightSearchResult>;
}

export type TaskStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";
export type AlertTier = "NONE" | "INTERESTING" | "GOOD" | "GREAT" | "EXCEPTIONAL";
export type PurchaseMode = "OBSERVATION" | "ALERT" | "APPROVAL_REQUIRED" | "AUTONOMOUS_PURCHASE";

export interface DurationRule {
  maxTravelHours: number;
  minStayDays: number;
}

export interface ScoreBreakdown {
  fareScore: number;
  seasonScore: number;
  experienceScore: number;
  flightQualityScore: number;
  durationFitScore: number;
  preferenceScore: number;
  atlasScore: number;
  explanation: string;
}

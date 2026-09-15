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
  priceEUR: number;
  currency: string;
  airline: string;
  stops: number;
  totalDurationMinutes: number;
  outboundDurationMinutes: number;
  inboundDurationMinutes: number;
  layoverMinutes: number; // durée cumulée des escales, 0 si vol direct
  baggageIncluded: boolean;
  cabinClass: CabinClass;
  selfTransfer: boolean;
  departTime: string; // HH:mm
  arriveTime: string; // HH:mm
  provider: string;
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

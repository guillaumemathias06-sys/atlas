// Season Score (section 8) — s'appuie sur SeasonMonth (climat/affluence par mois)
import { clamp } from "@/lib/utils/stats";

export interface SeasonMonthData {
  isDrySeason: boolean;
  isRainySeason: boolean;
  isMonsoon: boolean;
  cycloneRisk: boolean;
  extremeHeat: boolean;
  extremeCold: boolean;
  touristCrowding: number; // 0-100
  isHighSeason: boolean;
  seasonScore: number; // score éditorial de base 0-100 stocké en DB
}

export function computeSeasonScore(data: SeasonMonthData | null): { score: number; reasons: string[] } {
  if (!data) {
    return { score: 50, reasons: ["Aucune donnée de saisonnalité disponible pour cette période"] };
  }

  let score = data.seasonScore;
  const reasons: string[] = [];

  if (data.isMonsoon) {
    score -= 30;
    reasons.push("période de mousson");
  } else if (data.isRainySeason) {
    score -= 20;
    reasons.push("saison des pluies");
  } else if (data.isDrySeason) {
    score += 5;
    reasons.push("saison sèche favorable");
  }

  if (data.cycloneRisk) {
    score -= 25;
    reasons.push("risque cyclonique");
  }
  if (data.extremeHeat) {
    score -= 15;
    reasons.push("chaleur excessive");
  }
  if (data.extremeCold) {
    score -= 10;
    reasons.push("froid extrême");
  }
  if (data.isHighSeason && data.touristCrowding > 75) {
    score -= 8;
    reasons.push("forte affluence touristique");
  }
  if (!data.isHighSeason && data.touristCrowding < 35) {
    score += 5;
    reasons.push("basse saison, peu de foule");
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

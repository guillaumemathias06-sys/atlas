// Plafond de dépense mensuelle sur les recherches en provider réel (docs/providers.md,
// "coût réel des recherches"). Duffel facture 0,005$/recherche excédentaire dès que le
// ratio recherche/réservation (1500:1) est dépassé — et comme ATLAS ne réserve jamais
// automatiquement, ce ratio est TOUJOURS dépassé (0 réservation = 0 recherche gratuite).
// Ce module impose donc un plafond dur, indépendant de la fréquence de cron ou du volume
// par cycle (qui restent une première ligne de défense, voir scanVolume.ts) : dès que le
// plafond serait atteint, on bascule en mock pour le reste du mois calendaire.
import { prisma } from "@/lib/db";

// Estimation volontairement prudente (majorée) du coût par recherche en euros — le tarif
// réel Duffel (0,005$) convertit généralement à un montant légèrement inférieur en EUR,
// ce qui laisse une marge de sécurité sur le plafond configuré.
export const ESTIMATED_COST_PER_SEARCH_EUR = 0.005;

export function startOfCurrentMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Nombre de recherches effectuées via un provider réel (hors mock) depuis le 1er du mois. */
export async function getRealSearchCountThisMonth(now = new Date()): Promise<number> {
  return prisma.scanLog.count({
    where: { provider: { not: "mock" }, createdAt: { gte: startOfCurrentMonthUTC(now) } },
  });
}

export interface SearchBudgetStatus {
  searchesThisMonth: number;
  estimatedSpendEUR: number;
  maxMonthlySpendEUR: number;
  budgetExceeded: boolean;
}

export async function getSearchBudgetStatus(maxMonthlySpendEUR: number, now = new Date()): Promise<SearchBudgetStatus> {
  const searchesThisMonth = await getRealSearchCountThisMonth(now);
  const estimatedSpendEUR = Math.round(searchesThisMonth * ESTIMATED_COST_PER_SEARCH_EUR * 100) / 100;
  return {
    searchesThisMonth,
    estimatedSpendEUR,
    maxMonthlySpendEUR,
    // +1 : vérifie qu'AJOUTER une recherche de plus resterait sous le plafond, pas
    // seulement que le total actuel y est déjà.
    budgetExceeded: (searchesThisMonth + 1) * ESTIMATED_COST_PER_SEARCH_EUR > maxMonthlySpendEUR,
  };
}

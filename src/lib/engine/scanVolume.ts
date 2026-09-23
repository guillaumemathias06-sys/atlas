// Garde-fou de volume de scan — section 5 & docs/providers.md ("coût réel des
// recherches"). En mode simulation (provider mock, gratuit), ATLAS peut scanner large.
// Dès qu'un provider réel est actif (simulationMode=false), le volume par cycle est
// réduit fortement : un provider payant facture au-delà d'un ratio recherche/réservation,
// et ATLAS scanne en continu sans jamais réserver — le volume par défaut du mode
// simulation exploserait ce ratio en quelques heures.
import { prisma } from "@/lib/db";

export interface ScanVolumeLimits {
  planLimit: number; // nombre max de nouvelles tâches créées par cycle
  runLimit: number; // nombre max de tâches exécutées par cycle
}

export const SIMULATION_LIMITS: ScanVolumeLimits = { planLimit: 40, runLimit: 25 };
export const REAL_PROVIDER_LIMITS: ScanVolumeLimits = { planLimit: 10, runLimit: 5 };

export async function getScanVolumeLimits(): Promise<ScanVolumeLimits> {
  const settings = await prisma.userSettings.findUnique({ where: { id: "singleton" } });
  return settings?.simulationMode === false ? REAL_PROVIDER_LIMITS : SIMULATION_LIMITS;
}

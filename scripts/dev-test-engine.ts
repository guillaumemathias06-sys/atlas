// Script de vérification manuelle (pas un test unitaire) — planifie + exécute un cycle de scan.
import { planScans } from "@/lib/engine/scanPlanner";
import { runScanCycle } from "@/lib/engine/runner";
import { prisma } from "@/lib/db";

async function main() {
  const planned = await planScans(60);
  console.log("Tâches planifiées:", planned);

  const summary = await runScanCycle(60);
  console.log("Résumé du cycle:", summary);

  const topDeals = await prisma.deal.findMany({
    orderBy: { atlasScore: "desc" },
    take: 5,
    include: { observation: { include: { destination: true, origin: true } } },
  });
  for (const d of topDeals) {
    console.log(
      `${d.observation.origin.iata} -> ${d.observation.destination.city} (${d.observation.destination.iata}) — ${d.observation.priceEUR}€ — ATLAS ${d.atlasScore} (Fare ${d.fareScore}/Season ${d.seasonScore}/Exp ${d.experienceScore}/Flight ${d.flightQualityScore}/Dur ${d.durationFitScore})`
    );
    console.log(`   ${d.explanation}`);
  }

  const alerts = await prisma.alert.count();
  console.log("Alertes créées:", alerts);
}

main().finally(() => prisma.$disconnect());

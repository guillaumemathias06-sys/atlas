// Script ponctuel : restreint les aéroports de départ à NCE uniquement (décision de
// Guillaume, 23/09/2026 — maîtriser le coût des recherches réelles). Désactive les autres
// aéroports de départ et annule les tâches déjà planifiées pour eux, pour un effet
// immédiat (pas seulement sur les prochains cycles).
import { prisma } from "@/lib/db";

async function main() {
  const others = await prisma.airport.findMany({ where: { isOrigin: true, iata: { not: "NCE" } } });

  await prisma.airport.updateMany({
    where: { isOrigin: true, iata: { not: "NCE" } },
    data: { allowed: false },
  });
  console.log(`Aéroports désactivés : ${others.map((a) => a.iata).join(", ")}`);

  const cancelled = await prisma.searchTask.updateMany({
    where: { status: "PENDING", origin: { iata: { not: "NCE" } } },
    data: { status: "DONE" },
  });
  console.log(`Tâches en attente annulées (autres aéroports) : ${cancelled.count}`);

  const nce = await prisma.airport.findUnique({ where: { iata: "NCE" } });
  console.log(`NCE : allowed=${nce?.allowed}, priority=${nce?.priority}`);

  await prisma.auditLog.create({
    data: {
      action: "RESTRICTED_TO_NCE",
      metadata: JSON.stringify({ disabled: others.map((a) => a.iata), cancelledTasks: cancelled.count }),
    },
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

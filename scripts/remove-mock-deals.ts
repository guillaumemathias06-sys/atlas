// Script ponctuel : supprime tous les deals/observations issus du provider MOCK (décision
// de Guillaume, 23/09/2026 — maintenant que Duffel tourne en live, il ne veut voir que des
// deals réels dans son interface). Supprime dans l'ordre des contraintes : Alert -> Deal ->
// PriceObservation, uniquement pour les observations dont provider = "mock".
import { prisma } from "@/lib/db";

async function main() {
  const mockObservations = await prisma.priceObservation.findMany({
    where: { provider: "mock" },
    select: { id: true },
  });
  const observationIds = mockObservations.map((o) => o.id);
  console.log(`Observations mock trouvées : ${observationIds.length}`);

  if (observationIds.length === 0) {
    console.log("Rien à supprimer.");
    await prisma.$disconnect();
    return;
  }

  const mockDeals = await prisma.deal.findMany({
    where: { observationId: { in: observationIds } },
    select: { id: true },
  });
  const dealIds = mockDeals.map((d) => d.id);
  console.log(`Deals mock trouvés : ${dealIds.length}`);

  const deletedAlerts = await prisma.alert.deleteMany({ where: { dealId: { in: dealIds } } });
  console.log(`Alertes supprimées : ${deletedAlerts.count}`);

  const deletedDeals = await prisma.deal.deleteMany({ where: { id: { in: dealIds } } });
  console.log(`Deals supprimés : ${deletedDeals.count}`);

  const deletedObs = await prisma.priceObservation.deleteMany({ where: { id: { in: observationIds } } });
  console.log(`Observations supprimées : ${deletedObs.count}`);

  await prisma.auditLog.create({
    data: {
      action: "REMOVED_MOCK_DEALS",
      metadata: JSON.stringify({ observations: deletedObs.count, deals: deletedDeals.count, alerts: deletedAlerts.count }),
    },
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

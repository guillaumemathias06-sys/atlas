// Nettoyage complet de la base de test entre les tests d'intégration — ordre respectant
// les contraintes de clé étrangère (enfants avant parents).
import { prisma } from "@/lib/db";

export async function cleanDb() {
  await prisma.purchaseAuditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.priceObservation.deleteMany();
  await prisma.scanLog.deleteMany();
  await prisma.searchTask.deleteMany();
  await prisma.destinationEvent.deleteMany();
  await prisma.seasonMonth.deleteMany();
  await prisma.destinationProfile.deleteMany();
  await prisma.airport.deleteMany();
  await prisma.calendarBlock.deleteMany();
  await prisma.travelProfile.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.purchasePolicy.deleteMany();
}

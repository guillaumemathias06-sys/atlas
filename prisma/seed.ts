// Seed ATLAS — aéroports, destinations, saisonnalité, événements, profils, réglages.
// Termine par un premier cycle de scan (mode MOCK) pour peupler dashboard/deals.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AIRPORTS: Array<{
  iata: string; name: string; city: string; country: string;
  lat: number; lon: number; isOrigin: boolean; isDestinationOk: boolean;
  priority: number; distanceFromHomeKm?: number; accessCostEUR?: number; accessTimeMinutes?: number;
  minSavingsToUseEUR?: number;
}> = [
  // Aéroports de départ (section 3) — NCE = base par défaut
  { iata: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "France", lat: 43.6584, lon: 7.2159, isOrigin: true, isDestinationOk: false, priority: 100, distanceFromHomeKm: 0, accessCostEUR: 0, accessTimeMinutes: 20, minSavingsToUseEUR: 0 },
  { iata: "MRS", name: "Marseille Provence", city: "Marseille", country: "France", lat: 43.4393, lon: 5.2214, isOrigin: true, isDestinationOk: false, priority: 60, distanceFromHomeKm: 200, accessCostEUR: 25, accessTimeMinutes: 150, minSavingsToUseEUR: 150 },
  { iata: "LYS", name: "Lyon Saint-Exupéry", city: "Lyon", country: "France", lat: 45.7256, lon: 5.0811, isOrigin: true, isDestinationOk: false, priority: 55, distanceFromHomeKm: 300, accessCostEUR: 35, accessTimeMinutes: 210, minSavingsToUseEUR: 200 },
  { iata: "TRN", name: "Torino Caselle", city: "Turin", country: "Italie", lat: 45.2008, lon: 7.6497, isOrigin: true, isDestinationOk: false, priority: 50, distanceFromHomeKm: 250, accessCostEUR: 30, accessTimeMinutes: 180, minSavingsToUseEUR: 150 },
  { iata: "MXP", name: "Milano Malpensa", city: "Milan", country: "Italie", lat: 45.6306, lon: 8.7281, isOrigin: true, isDestinationOk: false, priority: 65, distanceFromHomeKm: 350, accessCostEUR: 45, accessTimeMinutes: 240, minSavingsToUseEUR: 250 },
  { iata: "LIN", name: "Milano Linate", city: "Milan", country: "Italie", lat: 45.4451, lon: 9.2767, isOrigin: true, isDestinationOk: false, priority: 55, distanceFromHomeKm: 350, accessCostEUR: 45, accessTimeMinutes: 240, minSavingsToUseEUR: 250 },
  { iata: "GVA", name: "Genève Aéroport", city: "Genève", country: "Suisse", lat: 46.2381, lon: 6.1089, isOrigin: true, isDestinationOk: false, priority: 40, distanceFromHomeKm: 300, accessCostEUR: 40, accessTimeMinutes: 200, minSavingsToUseEUR: 200 },

  // Destinations de démonstration (section 26)
  { iata: "NRT", name: "Narita", city: "Tokyo", country: "Japon", lat: 35.7719, lon: 140.3929, isOrigin: false, isDestinationOk: true, priority: 90 },
  { iata: "JFK", name: "John F. Kennedy", city: "New York", country: "États-Unis", lat: 40.6413, lon: -73.7781, isOrigin: false, isDestinationOk: true, priority: 85 },
  { iata: "FCO", name: "Roma Fiumicino", city: "Rome", country: "Italie", lat: 41.8003, lon: 12.2389, isOrigin: false, isDestinationOk: true, priority: 60 },
  { iata: "DPS", name: "Ngurah Rai", city: "Bali", country: "Indonésie", lat: -8.7481, lon: 115.1671, isOrigin: false, isDestinationOk: true, priority: 70 },
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thaïlande", lat: 13.6900, lon: 100.7501, isOrigin: false, isDestinationOk: true, priority: 65 },
  { iata: "KEF", name: "Keflavík", city: "Reykjavik", country: "Islande", lat: 63.9850, lon: -22.6056, isOrigin: false, isDestinationOk: true, priority: 60 },
  { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "Pays-Bas", lat: 52.3105, lon: 4.7683, isOrigin: false, isDestinationOk: true, priority: 55 },
  { iata: "JRO", name: "Kilimanjaro", city: "Arusha", country: "Tanzanie", lat: -3.4294, lon: 37.0745, isOrigin: false, isDestinationOk: true, priority: 55 },
];

// Destination Intelligence (section 8-9) — données manuelles de démonstration
const DESTINATIONS: Array<{
  iata: string; region: string; description: string;
  months: Array<{
    month: number; avgTempC: number; seaTempC?: number; rainfallMm: number; humidityPct: number;
    isDrySeason?: boolean; isRainySeason?: boolean; isMonsoon?: boolean; cycloneRisk?: boolean;
    extremeHeat?: boolean; extremeCold?: boolean; snowLikely?: boolean;
    touristCrowding: number; isHighSeason?: boolean; seasonScore: number;
  }>;
  events: Array<{
    name: string; description: string; typicalStartMonth: number; typicalStartDay: number;
    typicalEndMonth: number; typicalEndDay: number; dateVariability: "LOW" | "MEDIUM" | "HIGH";
    importance: number; potentialScore: number; recommendation: string;
  }>;
}> = [
  {
    iata: "NRT", region: "Asie de l'Est", description: "Tokyo — mégapole, temples, gastronomie, saisons marquées.",
    months: [
      { month: 3, avgTempC: 11, rainfallMm: 110, humidityPct: 60, touristCrowding: 65, isHighSeason: true, seasonScore: 75 },
      { month: 4, avgTempC: 15, rainfallMm: 130, humidityPct: 62, touristCrowding: 90, isHighSeason: true, seasonScore: 95 },
      { month: 7, avgTempC: 26, rainfallMm: 150, humidityPct: 75, extremeHeat: false, touristCrowding: 60, seasonScore: 55 },
      { month: 11, avgTempC: 14, rainfallMm: 90, humidityPct: 58, touristCrowding: 70, isHighSeason: true, seasonScore: 85 },
    ],
    events: [
      { name: "Floraison des cerisiers (sakura)", description: "Période emblématique, courte et variable selon les années.", typicalStartMonth: 3, typicalStartDay: 20, typicalEndMonth: 4, typicalEndDay: 10, dateVariability: "HIGH", importance: 95, potentialScore: 100, recommendation: "Réserver tôt, les dates exactes varient de ±10 jours selon les années." },
      { name: "Couleurs d'automne (koyo)", description: "Érables rouges dans les jardins et montagnes.", typicalStartMonth: 11, typicalStartDay: 5, typicalEndMonth: 11, typicalEndDay: 30, dateVariability: "MEDIUM", importance: 75, potentialScore: 88, recommendation: "Kyoto et Nikko sont particulièrement recommandés." },
    ],
  },
  {
    iata: "JFK", region: "Amérique du Nord", description: "New York — ville-monde, culture, architecture.",
    months: [
      { month: 4, avgTempC: 13, rainfallMm: 100, humidityPct: 55, touristCrowding: 55, seasonScore: 78 },
      { month: 6, avgTempC: 23, rainfallMm: 95, humidityPct: 60, touristCrowding: 70, isHighSeason: true, seasonScore: 80 },
      { month: 10, avgTempC: 15, rainfallMm: 90, humidityPct: 55, touristCrowding: 65, seasonScore: 85 },
      { month: 12, avgTempC: 4, rainfallMm: 100, humidityPct: 55, extremeCold: false, snowLikely: true, touristCrowding: 80, isHighSeason: true, seasonScore: 70 },
    ],
    events: [
      { name: "Marchés de Noël & illuminations", description: "Ambiance festive, patinoires, vitrines.", typicalStartMonth: 12, typicalStartDay: 1, typicalEndMonth: 12, typicalEndDay: 31, dateVariability: "LOW", importance: 60, potentialScore: 75, recommendation: "Prix élevés en hébergement, mais ambiance unique." },
    ],
  },
  {
    iata: "FCO", region: "Europe du Sud", description: "Rome — histoire antique, gastronomie, art.",
    months: [
      { month: 4, avgTempC: 16, rainfallMm: 65, humidityPct: 60, touristCrowding: 70, isHighSeason: true, seasonScore: 75 },
      { month: 7, avgTempC: 28, rainfallMm: 15, humidityPct: 50, extremeHeat: true, touristCrowding: 90, isHighSeason: true, seasonScore: 55 },
      { month: 10, avgTempC: 19, rainfallMm: 90, humidityPct: 65, touristCrowding: 55, seasonScore: 78 },
    ],
    events: [],
  },
  {
    iata: "DPS", region: "Asie du Sud-Est", description: "Bali — plages, rizières, temples.",
    months: [
      { month: 1, avgTempC: 27, seaTempC: 29, rainfallMm: 345, humidityPct: 85, isRainySeason: true, isMonsoon: true, touristCrowding: 55, seasonScore: 30 },
      { month: 7, avgTempC: 26, seaTempC: 27, rainfallMm: 60, humidityPct: 70, isDrySeason: true, touristCrowding: 85, isHighSeason: true, seasonScore: 88 },
      { month: 8, avgTempC: 26, seaTempC: 27, rainfallMm: 50, humidityPct: 68, isDrySeason: true, touristCrowding: 90, isHighSeason: true, seasonScore: 85 },
      { month: 12, avgTempC: 27, seaTempC: 29, rainfallMm: 280, humidityPct: 84, isRainySeason: true, touristCrowding: 70, isHighSeason: true, seasonScore: 40 },
    ],
    events: [],
  },
  {
    iata: "BKK", region: "Asie du Sud-Est", description: "Bangkok — temples, marchés, street food.",
    months: [
      { month: 1, avgTempC: 27, rainfallMm: 15, humidityPct: 55, isDrySeason: true, touristCrowding: 75, isHighSeason: true, seasonScore: 82 },
      { month: 4, avgTempC: 32, rainfallMm: 70, humidityPct: 60, extremeHeat: true, touristCrowding: 50, seasonScore: 50 },
      { month: 9, avgTempC: 28, rainfallMm: 320, humidityPct: 80, isRainySeason: true, touristCrowding: 40, seasonScore: 40 },
    ],
    events: [],
  },
  {
    iata: "KEF", region: "Europe du Nord", description: "Islande — nature, aurores boréales, volcans.",
    months: [
      { month: 2, avgTempC: -1, rainfallMm: 70, humidityPct: 75, extremeCold: false, touristCrowding: 40, seasonScore: 78 },
      { month: 9, avgTempC: 7, rainfallMm: 75, humidityPct: 78, touristCrowding: 45, seasonScore: 82 },
      { month: 6, avgTempC: 11, rainfallMm: 50, humidityPct: 70, touristCrowding: 75, isHighSeason: true, seasonScore: 65 },
    ],
    events: [
      { name: "Aurores boréales", description: "Meilleure visibilité par ciel dégagé et nuits longues.", typicalStartMonth: 9, typicalStartDay: 15, typicalEndMonth: 3, typicalEndDay: 31, dateVariability: "MEDIUM", importance: 85, potentialScore: 92, recommendation: "Éviter la pleine lune, privilégier zones sans pollution lumineuse." },
    ],
  },
  {
    iata: "AMS", region: "Europe de l'Ouest", description: "Amsterdam — canaux, musées, vélo.",
    months: [
      { month: 4, avgTempC: 10, rainfallMm: 45, humidityPct: 70, touristCrowding: 70, isHighSeason: true, seasonScore: 80 },
      { month: 8, avgTempC: 19, rainfallMm: 70, humidityPct: 72, touristCrowding: 80, isHighSeason: true, seasonScore: 70 },
    ],
    events: [
      { name: "Floraison des tulipes", description: "Champs de tulipes et Keukenhof en pleine floraison.", typicalStartMonth: 4, typicalStartDay: 1, typicalEndMonth: 5, typicalEndDay: 10, dateVariability: "MEDIUM", importance: 80, potentialScore: 90, recommendation: "Keukenhof + champs de Lisse, réserver les billets à l'avance." },
    ],
  },
  {
    iata: "JRO", region: "Afrique de l'Est", description: "Tanzanie — safaris, Kilimandjaro, migration.",
    months: [
      { month: 7, avgTempC: 22, rainfallMm: 20, humidityPct: 55, isDrySeason: true, touristCrowding: 70, isHighSeason: true, seasonScore: 88 },
      { month: 11, avgTempC: 24, rainfallMm: 90, humidityPct: 65, isRainySeason: true, touristCrowding: 40, seasonScore: 55 },
    ],
    events: [
      { name: "Grande migration (Serengeti/Mara)", description: "Traversée des gnous et zèbres, spectacle naturel majeur.", typicalStartMonth: 7, typicalStartDay: 1, typicalEndMonth: 9, typicalEndDay: 30, dateVariability: "MEDIUM", importance: 95, potentialScore: 98, recommendation: "Réserver les camps de brousse plusieurs mois à l'avance." },
    ],
  },
];

async function main() {
  console.log("→ Seed ATLAS…");

  for (const a of AIRPORTS) {
    await prisma.airport.upsert({
      where: { iata: a.iata },
      update: {},
      create: {
        iata: a.iata, name: a.name, city: a.city, country: a.country,
        latitude: a.lat, longitude: a.lon,
        isOrigin: a.isOrigin, isDestinationOk: a.isDestinationOk, priority: a.priority,
        distanceFromHomeKm: a.distanceFromHomeKm, accessCostEUR: a.accessCostEUR,
        accessTimeMinutes: a.accessTimeMinutes, minSavingsToUseEUR: a.minSavingsToUseEUR ?? 150,
      },
    });
  }
  console.log(`  ${AIRPORTS.length} aéroports`);

  for (const d of DESTINATIONS) {
    const profile = await prisma.destinationProfile.upsert({
      where: { iata: d.iata },
      update: { region: d.region, description: d.description },
      create: { iata: d.iata, region: d.region, description: d.description },
    });

    for (const m of d.months) {
      await prisma.seasonMonth.upsert({
        where: { destinationId_month: { destinationId: profile.id, month: m.month } },
        update: {},
        create: {
          destinationId: profile.id, month: m.month, avgTempC: m.avgTempC, seaTempC: m.seaTempC,
          rainfallMm: m.rainfallMm, humidityPct: m.humidityPct,
          isDrySeason: m.isDrySeason ?? false, isRainySeason: m.isRainySeason ?? false,
          isMonsoon: m.isMonsoon ?? false, cycloneRisk: m.cycloneRisk ?? false,
          extremeHeat: m.extremeHeat ?? false, extremeCold: m.extremeCold ?? false,
          snowLikely: m.snowLikely ?? false, touristCrowding: m.touristCrowding,
          isHighSeason: m.isHighSeason ?? false, seasonScore: m.seasonScore,
        },
      });
    }

    for (const e of d.events) {
      const existing = await prisma.destinationEvent.findFirst({ where: { destinationId: profile.id, name: e.name } });
      if (!existing) {
        await prisma.destinationEvent.create({
          data: {
            destinationId: profile.id, name: e.name, description: e.description,
            typicalStartMonth: e.typicalStartMonth, typicalStartDay: e.typicalStartDay,
            typicalEndMonth: e.typicalEndMonth, typicalEndDay: e.typicalEndDay,
            dateVariability: e.dateVariability, importance: e.importance,
            potentialScore: e.potentialScore, recommendation: e.recommendation,
          },
        });
      }
    }
  }
  console.log(`  ${DESTINATIONS.length} profils de destination (saisonnalité + événements)`);

  // Profils de voyage intégrés (section 13)
  await prisma.travelProfile.upsert({
    where: { name: "FAMILLE" }, update: {},
    create: { name: "FAMILLE", isBuiltIn: true, isActive: false, maxStops: 1, maxSelfTransfer: false, earliestDeparture: "07:00", latestDeparture: "21:00", penalizeLongLayover: true, minLayoverMinutes: 60, maxLayoverMinutes: 180, comfortWeight: 0.7, priceWeight: 0.3 },
  });
  await prisma.travelProfile.upsert({
    where: { name: "COUPLE" }, update: {},
    create: { name: "COUPLE", isBuiltIn: true, isActive: true, maxStops: 2, maxSelfTransfer: true, earliestDeparture: "05:00", latestDeparture: "23:00", penalizeLongLayover: true, minLayoverMinutes: 45, maxLayoverMinutes: 400, comfortWeight: 0.5, priceWeight: 0.5 },
  });
  await prisma.travelProfile.upsert({
    where: { name: "DEAL_HUNTER" }, update: {},
    create: { name: "DEAL_HUNTER", isBuiltIn: true, isActive: false, maxStops: 3, maxSelfTransfer: true, earliestDeparture: "00:00", latestDeparture: "23:59", penalizeLongLayover: false, minLayoverMinutes: 30, maxLayoverMinutes: 900, comfortWeight: 0.1, priceWeight: 0.9 },
  });
  console.log("  3 profils de voyage (FAMILLE / COUPLE / DEAL_HUNTER)");

  const activeProfile = await prisma.travelProfile.findUnique({ where: { name: "COUPLE" } });

  await prisma.userSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      activeProfileId: activeProfile?.id,
      durationRules: JSON.stringify([
        { maxTravelHours: 2, minStayDays: 2 },
        { maxTravelHours: 4, minStayDays: 4 },
        { maxTravelHours: 7, minStayDays: 7 },
        { maxTravelHours: 10, minStayDays: 10 },
        { maxTravelHours: 999, minStayDays: 15 },
      ]),
      priorityDestinationIatas: JSON.stringify(["NRT", "JFK"]),
      favoriteRegions: JSON.stringify(["Asie de l'Est", "Amérique du Nord"]),
    },
  });
  console.log("  Réglages par défaut");

  await prisma.purchasePolicy.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" }, // toutes les valeurs par défaut = kill switch engagé, mode OBSERVATION
  });
  console.log("  Purchase Policy (OBSERVATION, kill switch actif)");

  await prisma.auditLog.create({ data: { action: "SEED_COMPLETE", actor: "system" } });

  console.log("✓ Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

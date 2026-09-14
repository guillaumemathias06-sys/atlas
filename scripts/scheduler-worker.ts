// Worker autonome — exécute des cycles de scan en continu (section 5 : "ATLAS doit
// pouvoir fonctionner 24h/24"). Lancer avec `npm run worker` en parallèle de `npm run dev`.
// Appelle directement le moteur (pas de dépendance réseau à l'app Next.js).
import cron from "node-cron";
import { planScans } from "@/lib/engine/scanPlanner";
import { runScanCycle } from "@/lib/engine/runner";
import { prisma } from "@/lib/db";

async function tick() {
  const settings = await prisma.userSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.engineEnabled) {
    console.log(`[${new Date().toISOString()}] Moteur en pause, tick ignoré.`);
    return;
  }

  const planned = await planScans(40);
  const summary = await runScanCycle(25);
  console.log(
    `[${new Date().toISOString()}] planifiées=${planned.created} traitées=${summary.tasksProcessed} ` +
      `observations=${summary.observationsCreated} deals=${summary.dealsCreated} alertes=${summary.alertsCreated} erreurs=${summary.errors}`
  );
}

console.log("ATLAS scheduler-worker démarré — cycle toutes les 5 minutes (ajustable).");
tick(); // premier cycle immédiat

// Toutes les 5 minutes : la fréquence effective par route est adaptée dynamiquement
// par le moteur (section 5) via SearchTask.nextRunAt, donc ce cron n'est qu'un déclencheur.
cron.schedule("*/5 * * * *", () => {
  tick().catch((err) => console.error("Erreur durant le cycle de scan:", err));
});

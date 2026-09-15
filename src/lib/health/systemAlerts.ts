// Alertes système (section 28) — diagnostics de haut niveau sur l'état du moteur,
// distincts des alertes de deals. Fonction pure pour rester testable sans DB.
export interface SystemAlertInput {
  engineEnabled: boolean;
  pendingTasksCount: number;
  errorRate24hPct: number;
  lastScanAt: Date | null;
  now?: Date;
}

export interface SystemAlert {
  severity: "info" | "warn" | "danger";
  message: string;
}

const STALE_HOURS = 6;

export function computeSystemAlerts(input: SystemAlertInput): SystemAlert[] {
  const now = input.now ?? new Date();
  const alerts: SystemAlert[] = [];

  if (!input.lastScanAt) {
    alerts.push({ severity: "info", message: "Aucun scan n'a encore été exécuté." });
  } else {
    const hoursSinceLastScan = (now.getTime() - input.lastScanAt.getTime()) / (1000 * 60 * 60);
    if (input.engineEnabled && input.pendingTasksCount > 0 && hoursSinceLastScan > STALE_HOURS) {
      alerts.push({
        severity: "danger",
        message: `Le moteur est actif mais n'a pas tourné depuis ${Math.round(hoursSinceLastScan)}h alors que des tâches sont en attente — vérifier que le worker planifié tourne (npm run worker).`,
      });
    }
  }

  if (!input.engineEnabled && input.pendingTasksCount > 0) {
    alerts.push({ severity: "warn", message: `Moteur en pause avec ${input.pendingTasksCount} tâche(s) en attente.` });
  }

  if (input.errorRate24hPct > 30) {
    alerts.push({ severity: "danger", message: `Taux d'erreur élevé sur les scans (${input.errorRate24hPct}% sur 24h) — vérifier le journal.` });
  } else if (input.errorRate24hPct > 10) {
    alerts.push({ severity: "warn", message: `Taux d'erreur en hausse sur les scans (${input.errorRate24hPct}% sur 24h).` });
  }

  return alerts;
}

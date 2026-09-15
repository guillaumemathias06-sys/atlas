// Endpoint de déclenchement d'un cycle de scan — appelé par scripts/scheduler-worker.ts
// en local, et par un cron externe une fois déployé (Vercel Cron, voir vercel.json et
// docs/deployment.md). Protégé par CRON_SECRET dès que cette variable est définie
// (sécurité avant mise en ligne) : sans elle (dev local), l'endpoint reste ouvert pour
// rester simple à tester.
//
// GET et POST déclenchent tous deux un cycle : Vercel Cron n'appelle qu'en GET, mais un
// cron externe ou un appel manuel peut préférer POST (sémantiquement plus correct pour
// une action qui a un effet de bord).
import { NextRequest, NextResponse } from "next/server";
import { planScans } from "@/lib/engine/scanPlanner";
import { runScanCycle } from "@/lib/engine/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel : temps max d'exécution de la fonction (secondes)

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // aucune protection configurée (dev local) : on laisse passer
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function triggerScan(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const planned = await planScans(40);
  const summary = await runScanCycle(25);
  return NextResponse.json({ planned, summary });
}

export async function GET(request: NextRequest) {
  return triggerScan(request);
}

export async function POST(request: NextRequest) {
  return triggerScan(request);
}

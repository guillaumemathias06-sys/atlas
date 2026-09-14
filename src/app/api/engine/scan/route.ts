// Endpoint utilisé par le worker planifié (scripts/scheduler-worker.ts) pour déclencher
// un cycle de scan de façon autonome, indépendamment de l'UI.
import { NextResponse } from "next/server";
import { planScans } from "@/lib/engine/scanPlanner";
import { runScanCycle } from "@/lib/engine/runner";

export const dynamic = "force-dynamic";

export async function POST() {
  const planned = await planScans(40);
  const summary = await runScanCycle(25);
  return NextResponse.json({ planned, summary });
}

export async function GET() {
  return NextResponse.json({ message: "Utiliser POST pour déclencher un cycle de scan." });
}

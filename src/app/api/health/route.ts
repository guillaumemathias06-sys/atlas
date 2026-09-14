import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, observations, deals, pendingTasks] = await Promise.all([
    prisma.userSettings.findUnique({ where: { id: "singleton" } }),
    prisma.priceObservation.count(),
    prisma.deal.count(),
    prisma.searchTask.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({
    status: "ok",
    engineEnabled: settings?.engineEnabled ?? false,
    simulationMode: settings?.simulationMode ?? true,
    observations,
    deals,
    pendingTasks,
    providers: listProviders(),
    timestamp: new Date().toISOString(),
  });
}

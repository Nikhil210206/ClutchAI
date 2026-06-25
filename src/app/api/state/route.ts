import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { isGoogleConnected, connectedEmail, googleConfigured } from "@/lib/google/oauth";

export const runtime = "nodejs";

export async function GET() {
  const store = getStore();
  const [tasks, actions, allProposals] = await Promise.all([
    store.listTasks(),
    store.listActions(),
    store.listProposals(),
  ]);
  const proposals = allProposals.filter((p) => p.status === "pending");
  return NextResponse.json({
    tasks,
    actions,
    proposals,
    google: {
      connected: isGoogleConnected(),
      configured: googleConfigured(),
      email: connectedEmail(),
    },
  });
}

import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { isGoogleConnected, connectedEmail, googleConfigured } from "@/lib/google/oauth";

export const runtime = "nodejs";

export async function GET() {
  const store = getStore();
  const [tasks, actions] = await Promise.all([
    store.listTasks(),
    store.listActions(),
  ]);
  return NextResponse.json({
    tasks,
    actions,
    google: {
      connected: isGoogleConnected(),
      configured: googleConfigured(),
      email: connectedEmail(),
    },
  });
}

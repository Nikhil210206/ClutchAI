import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/runAgent";
import { getOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const result = await runAgent(message, getOrigin(req));
    return NextResponse.json(result);
  } catch (err) {
    console.error("chat error", err);
    return NextResponse.json(
      { error: "Agent failed", detail: String(err) },
      { status: 500 },
    );
  }
}

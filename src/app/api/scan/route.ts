import { NextResponse } from "next/server";
import { runScan } from "@/lib/agent/scan";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await runScan();
    return NextResponse.json(result);
  } catch (err) {
    console.error("scan error", err);
    return NextResponse.json(
      { proposals: [], message: "Scan failed — try again in a moment." },
      { status: 500 },
    );
  }
}

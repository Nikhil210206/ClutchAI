import { NextResponse } from "next/server";
import { authUrl, googleConfigured } from "@/lib/google/oauth";
import { getOrigin } from "@/lib/origin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth not configured (set GOOGLE_CLIENT_ID/SECRET)." },
      { status: 400 },
    );
  }
  return NextResponse.redirect(authUrl(getOrigin(req)));
}

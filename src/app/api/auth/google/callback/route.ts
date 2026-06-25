import { NextResponse } from "next/server";
import { handleCallback } from "@/lib/google/oauth";
import { getOrigin } from "@/lib/origin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const origin = getOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?google=error`);
  }

  try {
    await handleCallback(origin, code);
    return NextResponse.redirect(`${origin}/?google=connected`);
  } catch (err) {
    console.error("oauth callback error", err);
    return NextResponse.redirect(`${origin}/?google=error`);
  }
}

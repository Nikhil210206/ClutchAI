// Resolve the public origin of a request, honoring proxy headers so OAuth
// redirect URIs work both on localhost and behind Cloud Run's proxy.

export function getOrigin(req: Request): string {
  const env = process.env.PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_ORIGIN;
  if (env) return env.replace(/\/$/, "");

  const h = req.headers;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  if (host) return `${proto}://${host}`;

  return new URL(req.url).origin;
}

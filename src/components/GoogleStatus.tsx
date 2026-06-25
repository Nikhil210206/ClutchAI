"use client";

export function GoogleStatus({
  google,
  onChange,
}: {
  google?: { connected: boolean; configured: boolean; email: string | null };
  onChange: () => void;
}) {
  if (!google) {
    return <div className="h-9 w-40 animate-pulse rounded-lg bg-white/5" />;
  }

  if (!google.configured) {
    return (
      <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/45">
        Google not configured · agent runs in simulated mode
      </span>
    );
  }

  if (google.connected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="max-w-[160px] truncate">
          {google.email ?? "Google connected"}
        </span>
        <button
          onClick={async () => {
            await fetch("/api/auth/google/disconnect", { method: "POST" });
            onChange();
          }}
          className="ml-1 text-emerald-300/70 hover:text-emerald-200"
        >
          disconnect
        </button>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/google"
      className="flex items-center gap-2 rounded-lg border border-white/15 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:brightness-95"
    >
      <GoogleGlyph />
      Connect Calendar &amp; Gmail
    </a>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

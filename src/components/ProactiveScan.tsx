"use client";

import { useState } from "react";
import type { Proposal } from "@/lib/types";

const ACTION_LABEL: Record<Proposal["action"], { icon: string; label: string }> = {
  schedule_event: { icon: "📅", label: "Block time" },
  draft_email: { icon: "✉️", label: "Draft email" },
  generate_draft: { icon: "📝", label: "Write draft" },
};

export function ProactiveScan({
  proposals,
  onChange,
}: {
  proposals: Proposal[];
  onChange: () => Promise<void> | void;
}) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const scan = async () => {
    setScanning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      setMessage(data.message ?? null);
      await onChange();
    } catch {
      setMessage("Scan failed — try again.");
    } finally {
      setScanning(false);
    }
  };

  const decide = async (id: string, decision: "approve" | "dismiss") => {
    setBusyId(id);
    try {
      await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      await onChange();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Proactive scan</h2>
          <span className="text-[11px] text-white/40">acts before you ask</span>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="rounded-lg bg-amber-400/90 px-3 py-1.5 text-xs font-semibold text-amber-950 transition enabled:hover:brightness-110 disabled:opacity-50"
        >
          {scanning ? "Scanning…" : "Scan for risks"}
        </button>
      </div>

      <div className="space-y-2 p-3">
        {proposals.length === 0 && (
          <p className="px-1 py-2 text-xs text-white/40">
            {message ??
              "I’ll review your deadlines and pre-stage actions for the ones at risk — you approve with one click."}
          </p>
        )}

        {proposals.map((p) => {
          const meta = ACTION_LABEL[p.action];
          return (
            <div
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-amber-300/80">
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="text-white/40">· {p.taskTitle}</span>
              </div>
              <p className="mt-1 text-xs italic text-white/55">⚠ {p.risk}</p>
              <p className="mt-1.5 text-sm text-white/90">{previewOf(p)}</p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => decide(p.id, "approve")}
                  disabled={busyId === p.id}
                  className="rounded-lg bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-50"
                >
                  {busyId === p.id ? "…" : "Approve"}
                </button>
                <button
                  onClick={() => decide(p.id, "dismiss")}
                  disabled={busyId === p.id}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/60 transition enabled:hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function previewOf(p: Proposal): string {
  if (p.action === "schedule_event") {
    return `${p.title ?? p.taskTitle} — ${fmt(p.startISO)} to ${fmt(p.endISO)}`;
  }
  if (p.action === "draft_email") {
    return `“${p.subject ?? "(no subject)"}” — ${(p.body ?? "").slice(0, 90)}…`;
  }
  return `${p.title ?? p.taskTitle} — ${(p.content ?? "").slice(0, 90)}…`;
}

function fmt(iso?: string): string {
  if (!iso) return "?";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

"use client";

import { useState } from "react";
import { CalendarClock, FileText, Mail, Radar, AlertTriangle, Check, X } from "lucide-react";
import type { Proposal } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_META: Record<Proposal["action"], { icon: typeof Mail; label: string }> = {
  schedule_event: { icon: CalendarClock, label: "Block time" },
  draft_email: { icon: Mail, label: "Draft email" },
  generate_draft: { icon: FileText, label: "Write draft" },
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
    <div className="glass rounded-2xl border-primary/20 bg-gradient-to-b from-primary/[0.07] to-transparent">
      <div className="flex items-center justify-between border-b border-primary/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-primary" />
          <h2 className="text-[13px] font-semibold">Proactive scan</h2>
          <span className="text-[11px] text-muted-foreground">acts before you ask</span>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="glass-primary inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          <Radar className={cn("size-3.5", scanning && "animate-spin")} />
          {scanning ? "Scanning…" : "Scan for risks"}
        </button>
      </div>

      <div className="space-y-2 p-3">
        {proposals.length === 0 && (
          <p className="px-1 py-1.5 text-xs leading-relaxed text-muted-foreground/80">
            {message ??
              "I'll review your deadlines and pre-stage actions for the ones at risk — approve with one click."}
          </p>
        )}

        {proposals.map((p) => {
          const meta = ACTION_META[p.action];
          const Icon = meta.icon;
          return (
            <div key={p.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-wide text-primary/90">
                <Icon className="size-3.5" />
                <span>{meta.label}</span>
                <span className="truncate font-normal normal-case text-muted-foreground">· {p.taskTitle}</span>
              </div>
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] italic leading-snug text-muted-foreground/90">
                <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-400/80" />
                {p.risk}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-foreground/90">{previewOf(p)}</p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => decide(p.id, "approve")}
                  disabled={busyId === p.id}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-2.5 text-xs font-medium text-emerald-200 backdrop-blur transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  <Check className="size-3.5" /> Approve
                </button>
                <button
                  onClick={() => decide(p.id, "dismiss")}
                  disabled={busyId === p.id}
                  className="glass-btn inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs text-muted-foreground disabled:opacity-50"
                >
                  <X className="size-3.5" /> Dismiss
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
    return `"${p.subject ?? "(no subject)"}" — ${(p.body ?? "").slice(0, 90)}…`;
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

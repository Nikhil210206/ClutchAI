"use client";

import type { ActionLogEntry, ActionType } from "@/lib/types";

const META: Record<ActionType, { icon: string; label: string; tint: string }> = {
  create_task: { icon: "✓", label: "Task", tint: "text-sky-300 bg-sky-400/10" },
  schedule_event: { icon: "📅", label: "Calendar", tint: "text-emerald-300 bg-emerald-400/10" },
  draft_email: { icon: "✉️", label: "Email draft", tint: "text-amber-300 bg-amber-400/10" },
  generate_draft: { icon: "📝", label: "Draft", tint: "text-violet-300 bg-violet-400/10" },
};

export function ActionLog({ actions }: { actions: ActionLogEntry[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Here&apos;s what I handled for you</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
          {actions.length} action{actions.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-3">
        {actions.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-white/35">
            Actions the agent takes — calendar blocks, email drafts, deliverables — show up here.
          </p>
        ) : (
          actions.map((a) => {
            const m = META[a.type];
            return (
              <div
                key={a.id}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${m.tint}`}>
                    {m.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">
                        {m.label}
                      </span>
                      {a.mode === "simulated" && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                          simulated
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-white/90">{a.summary}</p>
                    {a.link && (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-indigo-300 hover:underline"
                      >
                        Open in Google ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Priority, Task } from "@/lib/types";

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_STYLE: Record<Priority, string> = {
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  high: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  medium: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  low: "bg-white/10 text-white/50 border-white/15",
};

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const sorted = [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  return (
    <div className="flex max-h-[42%] min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Prioritized plan</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-3">
        {sorted.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-white/35">
            Your prioritized subtasks appear here once the agent plans.
          </p>
        ) : (
          sorted.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/90">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
            <span
              className={`rounded border px-1.5 py-0.5 font-medium ${PRIORITY_STYLE[task.priority]}`}
            >
              {task.priority}
            </span>
            {task.dueDate && <span>due {task.dueDate}</span>}
            {task.effortMinutes != null && <span>~{task.effortMinutes}m</span>}
          </div>
          {task.reason && (
            <p className="mt-1 text-[11px] italic text-white/45">{task.reason}</p>
          )}
        </div>
        {task.draft && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] text-white/70 hover:bg-white/[0.12]"
          >
            {open ? "Hide draft" : "View draft"}
          </button>
        )}
      </div>
      {open && task.draft && (
        <pre className="scroll-thin mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-[11px] leading-relaxed text-white/75">
          {task.draft}
        </pre>
      )}
    </div>
  );
}

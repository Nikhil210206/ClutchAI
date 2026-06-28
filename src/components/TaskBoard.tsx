"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Priority, Task } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelHeader, EmptyState } from "@/components/ActionLog";
import { cn } from "@/lib/utils";

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_STYLE: Record<Priority, string> = {
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  medium: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  low: "border-border bg-muted text-muted-foreground",
};

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const sorted = [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  return (
    <div className="glass flex max-h-[44%] min-h-0 flex-col rounded-2xl">
      <PanelHeader title="Prioritized plan" count={tasks.length} unit="task" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {sorted.length === 0 ? (
            <EmptyState>Your prioritized subtasks appear here once the agent plans.</EmptyState>
          ) : (
            sorted.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-snug text-foreground/90">{task.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge
              variant="outline"
              className={cn("h-5 rounded-md px-1.5 text-[10px] font-medium capitalize", PRIORITY_STYLE[task.priority])}
            >
              {task.priority}
            </Badge>
            {task.dueDate && <span className="tabular-nums">due {formatDue(task.dueDate)}</span>}
            {task.effortMinutes != null && <span>· ~{task.effortMinutes}m</span>}
          </div>
          {task.reason && (
            <p className="mt-1.5 text-[11px] italic leading-snug text-muted-foreground/80">{task.reason}</p>
          )}
        </div>
        {task.draft && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
          >
            Draft <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      {open && task.draft && (
        <pre className="scroll-thin mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-md border bg-background/60 p-2.5 text-[11px] leading-relaxed text-foreground/75">
          {task.draft}
        </pre>
      )}
    </div>
  );
}

function formatDue(due: string): string {
  try {
    const d = new Date(due);
    if (isNaN(d.getTime())) return due;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return due;
  }
}

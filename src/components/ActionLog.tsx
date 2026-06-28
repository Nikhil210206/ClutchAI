"use client";

import { CalendarClock, CheckCircle2, FileText, Mail, ExternalLink } from "lucide-react";
import type { ActionLogEntry, ActionType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const META: Record<
  ActionType,
  { icon: typeof Mail; label: string; tint: string }
> = {
  create_task: { icon: CheckCircle2, label: "Task", tint: "text-sky-400 bg-sky-400/10" },
  schedule_event: { icon: CalendarClock, label: "Calendar", tint: "text-emerald-400 bg-emerald-400/10" },
  draft_email: { icon: Mail, label: "Email draft", tint: "text-amber-400 bg-amber-400/10" },
  generate_draft: { icon: FileText, label: "Draft", tint: "text-violet-400 bg-violet-400/10" },
};

export function ActionLog({ actions }: { actions: ActionLogEntry[] }) {
  return (
    <div className="glass flex min-h-0 flex-1 flex-col rounded-2xl">
      <PanelHeader
        title="What I handled for you"
        count={actions.length}
        unit="action"
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {actions.length === 0 ? (
            <EmptyState>
              Calendar blocks, email drafts and deliverables the agent creates show up here.
            </EmptyState>
          ) : (
            actions.map((a) => {
              const m = META[a.type];
              const Icon = m.icon;
              return (
                <div
                  key={a.id}
                  className="group rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 transition-colors hover:border-primary/30 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", m.tint)}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                          {m.label}
                        </span>
                        {a.mode === "simulated" && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal text-muted-foreground">
                            simulated
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[13px] leading-snug text-foreground/90">{a.summary}</p>
                      {a.link && (
                        <a
                          href={a.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Open in Google <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function PanelHeader({
  title,
  count,
  unit,
  accent,
}: {
  title: string;
  count?: number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2.5">
      <h2 className={cn("text-[13px] font-semibold", accent && "text-primary")}>{title}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {count} {unit}{count === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-8 text-center text-xs leading-relaxed text-muted-foreground/70">
      {children}
    </p>
  );
}

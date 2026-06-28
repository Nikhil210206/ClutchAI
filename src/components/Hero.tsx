"use client";

import { CalendarClock, FileText, ListChecks, Mail, Sparkles, ArrowRight } from "lucide-react";

const CAPABILITIES = [
  { icon: ListChecks, label: "Plans" },
  { icon: Sparkles, label: "Prioritizes" },
  { icon: CalendarClock, label: "Schedules" },
  { icon: Mail, label: "Drafts email" },
  { icon: FileText, label: "Writes deliverables" },
];

const EXAMPLES = [
  "Essay due Friday 5pm — and email Prof. Lee for an extension.",
  "Tax filing due Tuesday and I haven't started.",
  "Final-round interview Thursday 2pm — help me not bomb it.",
];

const d = (s: number): React.CSSProperties => ({ animationDelay: `${s}s` });

export function Hero({ onExample }: { onExample: (text: string) => void }) {
  return (
    <section className="relative mx-auto max-w-3xl px-4 pt-14 pb-10 text-center sm:pt-20">
      <div
        className="enter glass-soft mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground"
        style={d(0)}
      >
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-primary opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        Agentic productivity · powered by Gemini
      </div>

      <h1
        className="enter text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl"
        style={d(0.08)}
      >
        The deadline assistant that
        <br className="hidden sm:block" />{" "}
        <span className="bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent">
          actually does the work
        </span>
      </h1>

      <p
        className="enter mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base"
        style={d(0.16)}
      >
        Not another reminder app. Type or speak one messy sentence — ClutchAI plans it,
        prioritizes it, blocks real time on your calendar, drafts your emails, and hands you a
        first draft. Then shows you exactly what it handled.
      </p>

      <div className="enter mt-6 flex flex-wrap items-center justify-center gap-2" style={d(0.24)}>
        {CAPABILITIES.map((c) => (
          <span
            key={c.label}
            className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-foreground/80"
          >
            <c.icon className="size-3.5 text-primary" />
            {c.label}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-xl">
        <p
          className="enter mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          style={d(0.3)}
        >
          Try one
        </p>
        <div className="space-y-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={ex}
              onClick={() => onExample(ex)}
              style={d(0.36 + i * 0.07)}
              className="enter glass-btn group flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm text-foreground/85 hover:-translate-y-0.5"
            >
              <span>{ex}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

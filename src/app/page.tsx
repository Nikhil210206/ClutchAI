"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import type { ActionLogEntry, Proposal, Task } from "@/lib/types";
import { ActionLog } from "@/components/ActionLog";
import { TaskBoard } from "@/components/TaskBoard";
import { Composer } from "@/components/Composer";
import { GoogleStatus } from "@/components/GoogleStatus";
import { ProactiveScan } from "@/components/ProactiveScan";
import { Hero } from "@/components/Hero";
import { TextShimmer } from "@/components/agent-elements/text-shimmer";
import { BackgroundFX } from "@/components/BackgroundFX";
import { Reveal } from "@/components/Reveal";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

interface AppState {
  tasks: Task[];
  actions: ActionLogEntry[];
  proposals: Proposal[];
  google: { connected: boolean; configured: boolean; email: string | null };
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<AppState | null>(null);
  const [busy, setBusy] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);

  const refreshState = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => {
    refreshState();
    const params = new URLSearchParams(window.location.search);
    if (params.get("google")) window.history.replaceState({}, "", "/");
  }, [refreshState]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      appRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setMessages((m) => [...m, { role: "user", text: trimmed }]);
      setBusy(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        const data = await res.json();
        setMessages((m) => [
          ...m,
          { role: "agent", text: data.reply ?? data.error ?? "Something went wrong." },
        ]);
        await refreshState();
      } catch {
        setMessages((m) => [...m, { role: "agent", text: "Network error — please try again." }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, refreshState],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 lg:px-6">
      <BackgroundFX />
      {/* Nav */}
      <header className="glass-soft sticky top-0 z-20 -mx-4 flex items-center justify-between border-b border-white/5 px-4 py-3 lg:-mx-6 lg:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-sm">
            <Sparkles className="size-4 text-white" />
          </div>
          <div className="leading-none">
            <span className="text-sm font-semibold tracking-tight">ClutchAI</span>
            <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
              the last-minute life saver
            </span>
          </div>
        </div>
        <GoogleStatus google={state?.google} onChange={refreshState} />
      </header>

      <Hero onExample={send} />

      {/* App */}
      <section ref={appRef} className="scroll-mt-20 pb-10">
        <div className="grid h-[78vh] min-h-[560px] grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Conversation */}
          <Reveal className="flex min-h-0 flex-col" style={{ height: "100%" }}>
          <div className="glass flex h-full min-h-0 flex-col rounded-2xl">
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <span className="size-2 rounded-full bg-primary" />
              <h2 className="text-[13px] font-semibold">Conversation</h2>
            </div>
            <div ref={chatRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="px-1 pt-2 text-sm leading-relaxed text-muted-foreground">
                  Drop your messiest deadline below — or pick an example above. I&apos;ll break it
                  down, rank what&apos;s urgent, block real time, draft what I can, then show you
                  exactly what I handled.
                </p>
              )}

              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                        : "max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border bg-background/50 px-3.5 py-2 text-sm text-foreground/90"
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-flex gap-1">
                    <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
                  </span>
                  <TextShimmer className="text-sm font-medium" duration={1.6}>
                    Planning &amp; taking action…
                  </TextShimmer>
                </div>
              )}
            </div>
            <div className="border-t border-white/5">
              <Composer onSend={send} disabled={busy} />
            </div>
          </div>
          </Reveal>

          {/* Right column */}
          <Reveal className="min-h-0" style={{ height: "100%" }}>
          <div className="scroll-thin flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-0.5">
            <ProactiveScan proposals={state?.proposals ?? []} onChange={refreshState} />
            <ActionLog actions={state?.actions ?? []} />
            <TaskBoard tasks={state?.tasks ?? []} />
          </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: delay }}
    />
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionLogEntry, Proposal, Task } from "@/lib/types";
import { ActionLog } from "@/components/ActionLog";
import { TaskBoard } from "@/components/TaskBoard";
import { Composer } from "@/components/Composer";
import { GoogleStatus } from "@/components/GoogleStatus";
import { ProactiveScan } from "@/components/ProactiveScan";

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

const EXAMPLES = [
  "Essay on climate policy due Friday 5pm, and I need to email Prof. Lee for an extension just in case.",
  "Tax filing deadline next Tuesday — I haven't started and I have receipts to sort.",
  "Final-round interview at Acme on Thursday 2pm. Help me not bomb it.",
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<AppState | null>(null);
  const [busy, setBusy] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const refreshState = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => {
    refreshState();
    const params = new URLSearchParams(window.location.search);
    if (params.get("google")) {
      window.history.replaceState({}, "", "/");
    }
  }, [refreshState]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
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
        setMessages((m) => [
          ...m,
          { role: "agent", text: "Network error — please try again." },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, refreshState],
  );

  return (
    <div className="mx-auto flex h-screen w-full max-w-7xl flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-lg font-black text-white shadow-lg">
            C
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">ClutchAI</h1>
            <p className="text-xs text-white/50">
              The last-minute life saver — it plans, prioritizes &amp; <em>acts</em>.
            </p>
          </div>
        </div>
        <GoogleStatus google={state?.google} onChange={refreshState} />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
          <div ref={chatRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  Dump your messiest deadline below. I&apos;ll break it down, rank what&apos;s
                  urgent, block real time, and draft what I can — then show you exactly what I
                  handled.
                </p>
                <div className="space-y-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => send(ex)}
                      className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-white/80 transition hover:border-indigo-400/40 hover:bg-white/[0.07]"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-500/90 px-4 py-2.5 text-sm text-white"
                      : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white/90"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <span className="inline-flex gap-1">
                  <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
                </span>
                ClutchAI is planning &amp; taking action…
              </div>
            )}
          </div>

          <Composer onSend={send} disabled={busy} />
        </section>

        <section className="scroll-thin flex min-h-0 flex-col gap-4 overflow-y-auto">
          <ProactiveScan proposals={state?.proposals ?? []} onChange={refreshState} />
          <ActionLog actions={state?.actions ?? []} />
          <TaskBoard tasks={state?.tasks ?? []} />
        </section>
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/60"
      style={{ animationDelay: delay }}
    />
  );
}

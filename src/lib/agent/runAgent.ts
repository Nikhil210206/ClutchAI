// The ClutchAI agent: a two-phase autonomous Plan → Execute pass.
//
// Phase 1 (PLAN): Gemini sees ONLY the create_task tool and decomposes the messy
// goal into prioritized, dated subtasks.
// Phase 2 (EXECUTE): Gemini sees ONLY the action tools (schedule_event,
// draft_email, generate_draft) with the just-created tasks in context, so it is
// forced to take real action rather than stopping after planning.
//
// This is exactly two Gemini calls — reliable on the free tier — and guarantees
// the marquee outcome: real calendar blocks + drafts, every time. The summary is
// then built locally (no third call).

import { toolDeclarations, executeTool } from "./tools";
import type { ActionLogEntry } from "../types";
import { isGoogleConnected, connectedEmail } from "../google/oauth";
import { makeAI, generateWithResilience, statusOf } from "./gemini";

export interface AgentResult {
  reply: string;
  actions: ActionLogEntry[];
}

const planTools = toolDeclarations.filter((d) => d.name === "create_task");
// Phase 2 LLM handles only content actions; scheduling is done deterministically.
const draftTools = toolDeclarations.filter(
  (d) => d.name === "draft_email" || d.name === "generate_draft",
);

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Deterministically pick a 1-hour focus slot before the deadline, staggered by
 * index, always in the future and during daytime — so we don't depend on the LLM
 * to reliably call schedule_event. */
function focusSlot(dueDate: string | null, idx: number): { startISO: string; endISO: string } {
  const now = new Date();
  let due = dueDate ? new Date(dueDate) : new Date(now.getTime() + 3 * 864e5);
  if (isNaN(due.getTime())) due = new Date(now.getTime() + 3 * 864e5);

  // Aim for 10:00 on the day (idx+1) days before the deadline.
  const start = new Date(due.getTime() - (idx + 1) * 864e5);
  start.setHours(10, 0, 0, 0);

  const minStart = new Date(now.getTime() + (idx + 1) * 2 * 3600 * 1000);
  if (start < minStart) {
    start.setTime(minStart.getTime());
    start.setMinutes(0, 0, 0);
  }
  // Keep it before the deadline if at all possible.
  if (start >= due && due > now) {
    start.setTime(Math.max(now.getTime() + 3600 * 1000, due.getTime() - 2 * 3600 * 1000));
    start.setMinutes(0, 0, 0);
  }
  const end = new Date(start.getTime() + 3600 * 1000);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function dateContext(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const dow = today.toLocaleDateString(undefined, { weekday: "long" });
  return `Today is ${dow}, ${dateStr}. Resolve relative dates ('Friday', 'next week') against this.`;
}

function plannerInstruction(): string {
  return [
    "You are ClutchAI's PLANNER — a proactive productivity companion, not a passive reminder app.",
    dateContext(),
    "Decompose the user's goal/deadline into concrete, dated subtasks and create each with create_task.",
    "Rank by deadline × effort × impact: set priority and, in `reason`, flag anything the user WILL miss unless they start now.",
    "Be decisive — pick sensible dates/effort yourself. Create every subtask needed (typically 3–6). Call create_task only.",
  ].join("\n");
}

function executorInstruction(): string {
  const connected = isGoogleConnected();
  return [
    "You are ClutchAI's EXECUTOR. Focus time is already blocked — now give the user a head start on the work itself.",
    dateContext(),
    "Use the tools (do not reply with only text):",
    "- draft_email: for any task that means contacting someone (extension, follow-up, RSVP, reschedule, confirm), write a complete, ready-to-send body.",
    "- generate_draft: for any deliverable (essay, report, prep notes, study plan, application), write real first-draft content so the user never faces a blank page.",
    "Act on every task where one of these clearly applies. If a task needs neither, skip it.",
    connected
      ? `Google is connected${connectedEmail() ? ` (${connectedEmail()})` : ""}: email drafts are REAL.`
      : "Google is not connected yet, so email drafts are simulated — still call the tools.",
  ].join("\n");
}

/** Builds the "Here's what I handled for you" summary locally from the actions
 * taken — so we never spend a Gemini call just to write prose. */
function summarize(actions: ActionLogEntry[]): string {
  if (actions.length === 0) {
    return "I couldn't take an action on that — try giving me a goal with a deadline.";
  }
  const n = (t: string) => actions.filter((a) => a.type === t).length;
  const headline: string[] = [];
  if (n("create_task")) headline.push(`planned ${n("create_task")} task${n("create_task") > 1 ? "s" : ""}`);
  if (n("schedule_event")) headline.push(`blocked ${n("schedule_event")} time slot${n("schedule_event") > 1 ? "s" : ""}`);
  if (n("draft_email")) headline.push(`drafted ${n("draft_email")} email${n("draft_email") > 1 ? "s" : ""}`);
  if (n("generate_draft")) headline.push(`wrote ${n("generate_draft")} first draft${n("generate_draft") > 1 ? "s" : ""}`);

  const lines = actions.map((a) => `• ${a.summary}`);
  const simulated = actions.some((a) => a.mode === "simulated");
  const closing = simulated
    ? "\nConnect Google to turn the simulated calendar/email actions into real ones."
    : "\nIt's all in your action log on the right — review the drafts and you're set.";
  return `Here's what I handled for you — I ${joinList(headline)}:\n${lines.join("\n")}${closing}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "took action";
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

export async function runAgent(
  userMessage: string,
  origin: string,
): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      reply:
        "⚠️ No Gemini API key configured. Add a free AI Studio key as GEMINI_API_KEY to enable the agent.",
      actions: [],
    };
  }

  const ai = makeAI(apiKey);
  const actions: ActionLogEntry[] = [];

  try {
    // ---- Phase 1: PLAN (create_task only) ----
    const planResp = await generateWithResilience(ai, {
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: plannerInstruction(),
        tools: [{ functionDeclarations: planTools }],
      },
    });

    const createdTasks: { id: string; title: string; dueDate: string | null; priority: string }[] = [];
    for (const call of planResp.functionCalls ?? []) {
      if (call.name !== "create_task") continue;
      const { result, action } = await executeTool("create_task", call.args ?? {}, origin);
      if (action) actions.push(action);
      createdTasks.push({
        id: result.taskId,
        title: result.title,
        dueDate: result.dueDate ?? null,
        priority: result.priority,
      });
    }

    // Not a plannable goal — surface the model's text or a nudge.
    if (createdTasks.length === 0) {
      const text = planResp.text?.trim();
      return {
        reply: text && text.length > 0
          ? text
          : "Give me a goal with a deadline and I'll plan it and take action.",
        actions,
      };
    }

    // ---- Deterministic scheduling: guarantee real calendar blocks for the
    // top 1–2 tasks, so the calendar money-shot never depends on the LLM. ----
    const topTasks = [...createdTasks]
      .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2))
      .slice(0, 2);
    for (let i = 0; i < topTasks.length; i++) {
      const t = topTasks[i];
      const slot = focusSlot(t.dueDate, i);
      const { action } = await executeTool(
        "schedule_event",
        { title: `Focus: ${t.title}`, startISO: slot.startISO, endISO: slot.endISO, taskId: t.id },
        origin,
      );
      if (action) actions.push(action);
    }

    // ---- Phase 2: EXECUTE content actions (emails + deliverables) ----
    const taskList = createdTasks
      .map((t) => `- [${t.id}] ${t.title} (due ${t.dueDate ?? "n/a"}, ${t.priority})`)
      .join("\n");
    const execMessage = [
      `The user's request: "${userMessage}"`,
      "These subtasks were just created (use these exact taskIds):",
      taskList,
      "",
      "Focus time is already blocked. Now: draft_email for any task that means contacting someone, and generate_draft for any deliverable (essay, report, prep notes, plan). If none apply, do nothing.",
    ].join("\n");

    const execResp = await generateWithResilience(ai, {
      contents: [{ role: "user", parts: [{ text: execMessage }] }],
      config: {
        systemInstruction: executorInstruction(),
        tools: [{ functionDeclarations: draftTools }],
      },
    });

    for (const call of execResp.functionCalls ?? []) {
      const { action } = await executeTool(call.name ?? "", call.args ?? {}, origin);
      if (action) actions.push(action);
    }

    return { reply: summarize(actions), actions };
  } catch (err) {
    const status = statusOf(err);
    // Don't lose work — if we already created/acted, report it.
    if (actions.length > 0) {
      return { reply: summarize(actions), actions };
    }
    if (status === 429) {
      return {
        reply:
          "⏳ The free Gemini tier is rate-limited for a moment — wait ~30s and try again.",
        actions,
      };
    }
    throw err;
  }
}

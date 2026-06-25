// The ClutchAI agent loop: one autonomous Plan → Prioritize → Execute pass.
//
// Gemini decomposes a messy goal into dated subtasks (Planner), ranks them
// (Prioritizer), and then emits function calls that take real action (Executor).
// We run each tool, feed results back, and repeat until the model is done —
// then it reports what it handled.

import { type Content } from "@google/genai";
import { toolDeclarations, executeTool } from "./tools";
import type { ActionLogEntry } from "../types";
import { isGoogleConnected, connectedEmail } from "../google/oauth";
import { makeAI, generateWithResilience, statusOf } from "./gemini";

const MAX_STEPS = 8;

export interface AgentResult {
  reply: string;
  actions: ActionLogEntry[];
}

function systemInstruction(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const dow = today.toLocaleDateString(undefined, { weekday: "long" });
  const connected = isGoogleConnected();

  return [
    "You are ClutchAI — a proactive, agentic productivity companion, NOT a passive reminder app.",
    "Your job is to take real action so the user never misses a deadline.",
    `Today is ${dow}, ${dateStr}. Resolve relative dates ('Friday', 'next week') against this.`,
    "",
    "Operate in three roles, in order, within a single response:",
    "1) PLANNER — decompose the user's goal/deadline into concrete, dated subtasks. Call create_task for each.",
    "2) PRIORITIZER — rank by deadline × effort × impact. In each task's `reason`, flag anything the user WILL miss unless they start now.",
    "3) EXECUTOR — actually do things: schedule_event to block real work time, draft_email for messages that must be sent, generate_draft to give the user a real first draft instead of a blank page.",
    "",
    "You MUST do all three roles. Do not stop after only creating tasks — planning without execution is failure.",
    "Mandatory execution in every response:",
    "- Call schedule_event for AT LEAST the 1–2 most important tasks, placing real work-blocks before the deadline with buffer. A plan with no calendar blocks is incomplete.",
    "- If any task involves a message/request to another person (extension, follow-up, RSVP, reschedule), call draft_email with a complete, ready-to-send body.",
    "- If any task produces a deliverable (essay, report, prep notes, study plan, application), call generate_draft with real first-draft content so the user never faces a blank page.",
    "",
    "Rules:",
    "- ALWAYS take real action via tools — never reply with only advice, and never end after just create_task calls.",
    "- Be decisive: pick sensible times/dates yourself rather than asking the user to clarify.",
    connected
      ? `- Google is connected${connectedEmail() ? ` (${connectedEmail()})` : ""}: calendar events and email drafts are REAL.`
      : "- Google is NOT connected yet, so calendar/email actions are simulated — still call the tools; the user can connect Google to make them real.",
    "",
    "FINAL MESSAGE (required): after acting, ALWAYS write a confident summary that starts exactly with 'Here's what I handled for you:' followed by a bullet list of the concrete actions you took (tasks created, blocks scheduled, drafts written), then one final line on what needs the user's attention. Never reply with just 'Done.' or a single sentence.",
  ].join("\n");
}

/** Builds a "Here's what I handled for you" summary from the actions taken,
 * used as a safety net if the model returns a terse/empty final message. */
function summarize(actions: ActionLogEntry[]): string {
  if (actions.length === 0) {
    return "I couldn't take an action on that — try giving me a goal with a deadline.";
  }
  const lines = actions.map((a) => `• ${a.summary}`);
  return `Here's what I handled for you:\n${lines.join("\n")}`;
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
  const contents: Content[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];
  const actions: ActionLogEntry[] = [];

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await generateWithResilience(ai, {
        contents,
        config: {
          systemInstruction: systemInstruction(),
          tools: [{ functionDeclarations: toolDeclarations }],
        },
      });

      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        const text = response.text?.trim();
        return {
          reply: text && text.length > 12 ? text : summarize(actions),
          actions,
        };
      }

      // Record the model's tool-calling turn.
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) contents.push(modelContent);

      // Execute each call and feed responses back.
      const responseParts = [];
      for (const call of calls) {
        const { result, action } = await executeTool(
          call.name ?? "",
          call.args ?? {},
          origin,
        );
        if (action) actions.push(action);
        responseParts.push({
          functionResponse: { name: call.name ?? "", response: result },
        });
      }
      contents.push({ role: "user", parts: responseParts });
    }

    return {
      reply:
        "I took several actions — check the action log on the right for everything I handled.",
      actions,
    };
  } catch (err) {
    const status = statusOf(err);
    // If we already took actions before failing, report them — don't lose work.
    if (actions.length > 0) {
      return {
        reply:
          "I handled part of this — see the action log on the right. I hit a temporary limit before finishing; send it again and I'll complete the rest.",
        actions,
      };
    }
    if (status === 429) {
      return {
        reply:
          "⏳ The free Gemini tier is rate-limited for a moment. Wait ~30s and try again — your quota refills shortly.",
        actions,
      };
    }
    throw err;
  }
}

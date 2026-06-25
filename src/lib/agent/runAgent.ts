// The ClutchAI agent loop: one autonomous Plan → Prioritize → Execute pass.
//
// Gemini decomposes a messy goal into dated subtasks (Planner), ranks them
// (Prioritizer), and then emits function calls that take real action (Executor).
// We run each tool, feed results back, and repeat until the model is done —
// then it reports what it handled.

import { GoogleGenAI, type Content } from "@google/genai";
import { toolDeclarations, executeTool } from "./tools";
import type { ActionLogEntry } from "../types";
import { isGoogleConnected, connectedEmail } from "../google/oauth";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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
    "Rules:",
    "- ALWAYS take at least one real action via tools — never reply with only advice.",
    "- Be decisive: pick sensible times/dates yourself rather than asking the user to clarify.",
    "- When you schedule work blocks, place them before the deadline with buffer.",
    connected
      ? `- Google is connected${connectedEmail() ? ` (${connectedEmail()})` : ""}: calendar events and email drafts are REAL.`
      : "- Google is NOT connected yet, so calendar/email actions are simulated — still call the tools; the user can connect Google to make them real.",
    "",
    "After acting, give a short, confident summary in the voice of 'Here's what I handled for you:' — bullet the concrete actions, then one line on what needs the user's attention.",
  ].join("\n");
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

  const ai = new GoogleGenAI({ apiKey });
  const contents: Content[] = [
    { role: "user", parts: [{ text: userMessage }] },
  ];
  const actions: ActionLogEntry[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: systemInstruction(),
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    });

    const calls = response.functionCalls ?? [];
    if (calls.length === 0) {
      return { reply: response.text ?? "Done.", actions };
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
}

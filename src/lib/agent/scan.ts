// Proactive Scan — the autonomous layer.
//
// Without a new user prompt, this reviews the user's existing tasks, asks Gemini
// to judge which deadlines are AT RISK, and pre-stages concrete actions
// (calendar blocks, drafts) as Proposals the user approves with one click.
// This is the "it did something I didn't even ask for" autonomy signal.

import { Type } from "@google/genai";
import { randomUUID } from "crypto";
import { getStore } from "../store";
import type { Proposal, Task } from "../types";
import { generateJSONWithResilience, makeAI } from "./gemini";
import { isGoogleConnected } from "../google/oauth";

const proposalSchema = {
  type: Type.OBJECT,
  properties: {
    proposals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          taskId: { type: Type.STRING },
          taskTitle: { type: Type.STRING },
          risk: {
            type: Type.STRING,
            description: "One sentence on why this is at risk and why acting now helps.",
          },
          action: {
            type: Type.STRING,
            enum: ["schedule_event", "draft_email", "generate_draft"],
          },
          title: { type: Type.STRING },
          startISO: { type: Type.STRING },
          endISO: { type: Type.STRING },
          subject: { type: Type.STRING },
          body: { type: Type.STRING },
          to: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ["taskId", "taskTitle", "risk", "action"],
      },
    },
  },
  required: ["proposals"],
};

export interface ScanResult {
  proposals: Proposal[];
  message: string;
}

export async function runScan(): Promise<ScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { proposals: [], message: "Add a Gemini API key to enable scanning." };
  }

  const store = getStore();
  const tasks = (await store.listTasks()).filter((t) => t.status !== "done");
  if (tasks.length === 0) {
    return {
      proposals: [],
      message: "No open tasks to scan yet — give me a deadline first.",
    };
  }

  // Avoid re-proposing for tasks that already have a pending proposal.
  const existing = await store.listProposals();
  const pendingTaskIds = new Set(
    existing.filter((p) => p.status === "pending").map((p) => p.taskId),
  );

  const today = new Date();
  const dateStr = today.toISOString();
  const taskDigest = tasks.map((t: Task) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    effortMinutes: t.effortMinutes,
    priority: t.priority,
  }));

  const prompt = [
    "You are ClutchAI's proactive watchdog. The user did NOT ask you to do this —",
    "you are scanning their open tasks on your own to catch deadlines before they slip.",
    `Current time: ${dateStr}.`,
    "Here are the open tasks (JSON):",
    JSON.stringify(taskDigest),
    "",
    "Identify the tasks most AT RISK (deadline near relative to effort, high priority,",
    "or clearly not started). For each at-risk task, pre-stage ONE high-leverage action",
    "the user can approve in one click:",
    "- schedule_event: provide title, startISO, endISO (place real focus time before the deadline).",
    "- draft_email: provide subject and a complete, ready-to-send body (and `to` if implied).",
    "- generate_draft: provide title and real first-draft `content` (outline, notes, plan).",
    isGoogleConnected()
      ? "Google is connected, so scheduled events and drafts will be real on approval."
      : "Google is not connected; actions will be simulated until the user connects it.",
    "Propose at most 4 actions, highest-risk first. Use the exact taskId from the list.",
  ].join("\n");

  const ai = makeAI(apiKey);
  const data = await generateJSONWithResilience(ai, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: proposalSchema,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = Array.isArray(data?.proposals) ? data.proposals : [];
  const proposals: Proposal[] = [];
  for (const p of raw) {
    if (pendingTaskIds.has(p.taskId)) continue; // dedupe
    const proposal: Proposal = {
      id: randomUUID(),
      taskId: p.taskId ?? null,
      taskTitle: p.taskTitle ?? "Task",
      risk: p.risk ?? "At risk of slipping.",
      action: p.action,
      title: p.title,
      startISO: p.startISO,
      endISO: p.endISO,
      subject: p.subject,
      body: p.body,
      to: p.to,
      content: p.content,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await store.addProposal(proposal);
    proposals.push(proposal);
  }

  return {
    proposals,
    message:
      proposals.length > 0
        ? `I found ${proposals.length} thing${proposals.length === 1 ? "" : "s"} at risk and pre-staged action${proposals.length === 1 ? "" : "s"} for you.`
        : "I scanned your tasks — nothing urgent needs pre-staged action right now.",
  };
}

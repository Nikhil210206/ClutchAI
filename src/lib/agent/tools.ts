// Executor tools exposed to Gemini via function-calling. Each tool takes a real
// action (Firestore write, real Calendar event, real Gmail draft, stored
// deliverable) and records an entry in the action log.

import { Type, type FunctionDeclaration } from "@google/genai";
import { randomUUID } from "crypto";
import { getStore } from "../store";
import type { ActionLogEntry, Priority, Task } from "../types";
import { createCalendarEvent } from "../google/calendar";
import { createGmailDraft } from "../google/gmail";

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "create_task",
    description:
      "Persist a concrete, dated subtask the user needs to complete. Call once per subtask after decomposing the user's goal.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Short imperative task title." },
        dueDate: {
          type: Type.STRING,
          description: "Due date/time in ISO 8601 (YYYY-MM-DD or full datetime). Omit if none.",
        },
        effortMinutes: {
          type: Type.NUMBER,
          description: "Rough effort estimate in minutes.",
        },
        priority: {
          type: Type.STRING,
          enum: ["critical", "high", "medium", "low"],
          description: "Priority from deadline × effort × impact.",
        },
        reason: {
          type: Type.STRING,
          description: "One line on why this priority (e.g. 'will miss unless started today').",
        },
      },
      required: ["title", "priority"],
    },
  },
  {
    name: "schedule_event",
    description:
      "Create a real Google Calendar time-block so the user actually has time reserved to do a task.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        startISO: { type: Type.STRING, description: "Event start, full ISO datetime." },
        endISO: { type: Type.STRING, description: "Event end, full ISO datetime." },
        description: { type: Type.STRING },
        taskId: { type: Type.STRING, description: "Related task id, if any." },
      },
      required: ["title", "startISO", "endISO"],
    },
  },
  {
    name: "draft_email",
    description:
      "Create a real Gmail draft (e.g. an extension request, follow-up, or RSVP) ready for the user to review and send.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        body: { type: Type.STRING, description: "Full email body, polished and ready to send." },
        to: { type: Type.STRING, description: "Recipient email if known." },
        taskId: { type: Type.STRING },
      },
      required: ["subject", "body"],
    },
  },
  {
    name: "generate_draft",
    description:
      "Produce a first-draft deliverable (essay outline, report skeleton, message, plan) and attach it to a task so the user starts from something, not a blank page.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskId: { type: Type.STRING, description: "Task to attach the draft to, if known." },
        title: { type: Type.STRING, description: "What the deliverable is for." },
        content: { type: Type.STRING, description: "The full first-draft content." },
      },
      required: ["title", "content"],
    },
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = Record<string, any>;

async function logAction(entry: Omit<ActionLogEntry, "id" | "createdAt">) {
  const action: ActionLogEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  await getStore().addAction(action);
  return action;
}

/** Executes a tool call and returns a compact result the model can read back. */
export async function executeTool(
  name: string,
  args: Args,
  origin: string,
): Promise<{ result: Args; action: ActionLogEntry | null }> {
  const store = getStore();

  switch (name) {
    case "create_task": {
      const task: Task = {
        id: randomUUID(),
        title: args.title,
        dueDate: args.dueDate ?? null,
        effortMinutes: args.effortMinutes ?? null,
        priority: (args.priority as Priority) ?? "medium",
        reason: args.reason ?? null,
        draft: null,
        status: "todo",
        createdAt: new Date().toISOString(),
      };
      await store.addTask(task);
      const action = await logAction({
        type: "create_task",
        summary: `Added task "${task.title}"${task.dueDate ? ` (due ${task.dueDate})` : ""} — ${task.priority}.`,
        link: null,
        mode: "real",
        status: "done",
        taskId: task.id,
      });
      return { result: { taskId: task.id, ...task }, action };
    }

    case "schedule_event": {
      const r = await createCalendarEvent(origin, {
        title: args.title,
        startISO: args.startISO,
        endISO: args.endISO,
        description: args.description,
      });
      const action = await logAction({
        type: "schedule_event",
        summary: r.summary,
        link: r.link,
        mode: r.mode,
        status: "done",
        taskId: args.taskId ?? null,
      });
      return { result: { mode: r.mode, link: r.link, summary: r.summary }, action };
    }

    case "draft_email": {
      const r = await createGmailDraft(origin, {
        to: args.to,
        subject: args.subject,
        body: args.body,
      });
      const action = await logAction({
        type: "draft_email",
        summary: r.summary,
        link: r.link,
        mode: r.mode,
        status: "done",
        taskId: args.taskId ?? null,
      });
      return { result: { mode: r.mode, link: r.link, summary: r.summary }, action };
    }

    case "generate_draft": {
      if (args.taskId) {
        await store.updateTask(args.taskId, { draft: args.content });
      }
      const action = await logAction({
        type: "generate_draft",
        summary: `Wrote a first draft for "${args.title}" — review and refine.`,
        link: null,
        mode: "real",
        status: "done",
        taskId: args.taskId ?? null,
      });
      return {
        result: { ok: true, attachedTo: args.taskId ?? null, preview: String(args.content).slice(0, 200) },
        action,
      };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` }, action: null };
  }
}

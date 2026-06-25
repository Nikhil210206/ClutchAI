// Core domain types for ClutchAI.

export type Priority = "critical" | "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD) or full ISO datetime when the task is due. */
  dueDate: string | null;
  /** Rough effort in minutes, estimated by the Planner. */
  effortMinutes: number | null;
  priority: Priority;
  /** One-line reason the Prioritizer assigned this rank. */
  reason: string | null;
  /** Optional generated deliverable (e.g. an essay outline or email body). */
  draft: string | null;
  status: "todo" | "in_progress" | "done";
  createdAt: string;
}

export type ActionType =
  | "create_task"
  | "schedule_event"
  | "draft_email"
  | "generate_draft";

export interface ActionLogEntry {
  id: string;
  type: ActionType;
  /** Human summary: "Blocked 2–4pm Thu for the essay draft." */
  summary: string;
  /** Deep link to the real artifact (Calendar event / Gmail draft) when available. */
  link: string | null;
  /** "real" = hit a live Google API; "simulated" = Google not connected yet. */
  mode: "real" | "simulated";
  status: "done" | "failed";
  /** Related task id when applicable. */
  taskId: string | null;
  createdAt: string;
}

/** A pre-staged action the proactive scan proposes for one-click approval. */
export interface Proposal {
  id: string;
  taskId: string | null;
  taskTitle: string;
  /** Why this task is at risk — the agent's reasoning. */
  risk: string;
  action: "schedule_event" | "draft_email" | "generate_draft";
  /** Action args (subset used depends on `action`). */
  title?: string;
  startISO?: string;
  endISO?: string;
  subject?: string;
  body?: string;
  to?: string;
  content?: string;
  status: "pending" | "approved" | "dismissed";
  createdAt: string;
}

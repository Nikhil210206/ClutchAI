// Real Google Calendar event creation.

import { google } from "googleapis";
import { authorizedClient } from "./oauth";

export interface ScheduleResult {
  mode: "real" | "simulated";
  link: string | null;
  summary: string;
}

/**
 * Creates a real Calendar event when Google is connected; otherwise returns a
 * simulated result so the agent flow still completes (and the action log shows
 * it as "simulated" until the user connects Google).
 */
export async function createCalendarEvent(
  origin: string,
  args: {
    title: string;
    startISO: string;
    endISO: string;
    description?: string;
  },
): Promise<ScheduleResult> {
  const client = authorizedClient(origin);
  const when = formatWhen(args.startISO, args.endISO);

  if (!client) {
    return {
      mode: "simulated",
      link: null,
      summary: `Would block ${when} for "${args.title}" (connect Google Calendar to make it real).`,
    };
  }

  const calendar = google.calendar({ version: "v3", auth: client });
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: args.title,
      description: args.description,
      start: { dateTime: args.startISO },
      end: { dateTime: args.endISO },
    },
  });

  return {
    mode: "real",
    link: res.data.htmlLink ?? null,
    summary: `Blocked ${when} for "${args.title}".`,
  };
}

function formatWhen(startISO: string, endISO: string): string {
  try {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const day = s.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const t = (d: Date) =>
      d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${day} ${t(s)}–${t(e)}`;
  } catch {
    return `${startISO} → ${endISO}`;
  }
}

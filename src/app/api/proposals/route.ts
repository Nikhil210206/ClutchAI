import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { executeTool } from "@/lib/agent/tools";
import { getOrigin } from "@/lib/origin";

export const runtime = "nodejs";

// Approve or dismiss a pre-staged proposal.
// Body: { id: string, decision: "approve" | "dismiss" }
export async function POST(req: Request) {
  try {
    const { id, decision } = await req.json();
    const store = getStore();
    const proposal = await store.getProposal(id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (proposal.status !== "pending") {
      return NextResponse.json({ ok: true, alreadyHandled: true });
    }

    if (decision === "dismiss") {
      await store.updateProposal(id, { status: "dismissed" });
      return NextResponse.json({ ok: true });
    }

    // Approve → run the corresponding executor tool (logs a real/simulated action).
    const args = argsFor(proposal);
    const { action } = await executeTool(proposal.action, args, getOrigin(req));
    await store.updateProposal(id, { status: "approved" });
    return NextResponse.json({ ok: true, action });
  } catch (err) {
    console.error("proposal action error", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function argsFor(p: {
  action: string;
  taskId: string | null;
  title?: string;
  startISO?: string;
  endISO?: string;
  subject?: string;
  body?: string;
  to?: string;
  content?: string;
  taskTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Record<string, any> {
  switch (p.action) {
    case "schedule_event":
      return {
        title: p.title ?? p.taskTitle,
        startISO: p.startISO,
        endISO: p.endISO,
        taskId: p.taskId,
      };
    case "draft_email":
      return { subject: p.subject, body: p.body, to: p.to, taskId: p.taskId };
    case "generate_draft":
      return { title: p.title ?? p.taskTitle, content: p.content, taskId: p.taskId };
    default:
      return {};
  }
}

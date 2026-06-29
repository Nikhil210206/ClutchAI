# ClutchAI — The Last-Minute Life Saver

> An **agentic** productivity companion that doesn't just remind you — it **plans,
> prioritizes, and takes real action** before your deadlines slip.

**🔗 Live demo:** https://clutchai-709669994781.asia-south1.run.app (deployed on Google Cloud Run)

ClutchAI turns one messy sentence — *"Essay due Friday and I need to email my prof for an extension"* —
into a concrete plan with **real Google Calendar blocks**, a **real Gmail draft**,
and a **first-draft deliverable**, then shows you exactly *"Here's what I handled
for you."*

## Why it's different

Most tools stop at reminders. ClutchAI's bet is **autonomy** — every feature
answers *"what did the agent DO for me?"*, never *"what did it remind me about?"*

## How it works — the agent loop

A single Gemini **function-calling** loop runs three roles autonomously in one pass:

1. **Planner** — decomposes a goal/deadline into concrete, dated subtasks.
2. **Prioritizer** — ranks by deadline × effort × impact and flags *"you'll miss
   this unless you start now."*
3. **Executor** — calls real tools to take action, feeds results back, and repeats
   until done, then reports what it handled.

### Executor tools (Gemini function declarations)

| Tool | Action |
|---|---|
| `create_task` | Persist a prioritized, dated subtask |
| `schedule_event` | Create a **real Google Calendar** time-block |
| `draft_email` | Create a **real Gmail draft** ready to review/send |
| `generate_draft` | Write a first-draft deliverable (outline, email body, plan) |

Every executed tool writes to an **Action Log** — the *"Here's what I handled for
you"* panel that makes the autonomy visible.

## Tech stack

- **Next.js (App Router) + TypeScript + Tailwind CSS** — full-stack, deployed on Cloud Run.
- **Google Gemini** (`@google/genai`, `gemini-2.5-flash`) — drives the agent loop
  via function-calling, with retry/backoff + model fallback for free-tier resilience.
- **Google Calendar API + Gmail API** — real actions via OAuth 2.0 (tight scopes:
  `calendar.events`, `gmail.compose`).
- **Firestore** (Native mode) for persistence in production, with a zero-config
  in-memory fallback for local dev.
- **Web Speech API** — voice input: speak a messy deadline, same agent pipeline.

### Google technologies utilized

Gemini API · Google Calendar API · Gmail API · Cloud Firestore · Google Cloud Run.

## Run locally (free)

```bash
npm install
cp .env.example .env.local      # add your free Gemini key (GEMINI_API_KEY)
PORT=3033 npm run dev           # http://localhost:3033
```

A free Gemini API key (no card) comes from https://aistudio.google.com/apikey.
Without Google OAuth configured, calendar/email actions run in a clearly-labeled
**simulated** mode so the full flow still works.

To enable **real** Calendar + Gmail (free, no billing), follow
[`docs/GOOGLE_SETUP.md`](docs/GOOGLE_SETUP.md).

## Deploy to Google Cloud Run

A `Dockerfile` (Next.js standalone output) is included. See
[`docs/DEPLOY.md`](docs/DEPLOY.md) for the full from-scratch GCP + Cloud Run steps.

## Environment variables

See [`.env.example`](.env.example). Summary:

| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Free AI Studio key (required for the agent) |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth for real Calendar/Gmail |
| `GOOGLE_REDIRECT_URI` | Optional; auto-derived from request origin |
| `PUBLIC_ORIGIN` | Set to the public URL in production |

## Project structure

```
src/
  app/
    page.tsx                 # chat + voice + action log + task board UI
    api/chat/route.ts        # runs the agent loop
    api/state/route.ts       # tasks + actions + google status
    api/auth/google/*        # OAuth connect / callback / disconnect
  components/                # Composer (voice), ActionLog, TaskBoard, GoogleStatus
  lib/
    agent/runAgent.ts        # Plan → Prioritize → Execute loop (resilient)
    agent/tools.ts           # tool declarations + handlers
    google/{oauth,calendar,gmail}.ts
    store.ts                 # Firestore + in-memory fallback
```

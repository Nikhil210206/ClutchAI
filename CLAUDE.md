# Vibe2Ship Hackathon — Project Context & Build Plan

> This file is the single source of truth for the build. Claude Code auto-loads it.
> Submission platform: **BlockseBlock**. Today's anchor date when this was written: 2026-06-25.

---

## 1. Hard constraints (do not violate)

- **Build window:** 22 Jun 2026 3:00 PM → 29 Jun 2026 2:00 PM.
- **Submission deadline:** 29 Jun 2026, 2:00 PM. Late = rejected.
- **MANDATORY deploy on Google Cloud.** Allowed tools: Google AI Studio, Antigravity, etc.
  Deploy reference: https://ai.google.dev/gemini-api/docs/aistudio-deploying
- Deployed link must stay **live and public through the entire evaluation period**.
- **Final Submit on BlockseBlock is irreversible** — no edits/resubmits after. Only lock when fully done.

## 2. Mandatory submission deliverables

1. **Deployed application link** — public, fully functional, on Google Cloud.
2. **GitHub repository** — code + documentation (README).
3. **Project Description (Google Doc, link-shareable)** containing:
   - Problem Statement Selected
   - Solution Overview
   - Key Features
   - Technologies Used
   - Google Technologies Utilized
   (Keep version history clean — organizers may review it.)

## 3. Evaluation matrix (what actually scores)

| Criteria | Weight |
|---|---|
| Problem Solving & Impact | 20% |
| **Agentic Depth** | **20%** |
| Innovation & Creativity | 20% |
| Usage of Google Technologies | 15% |
| Product Experience & Design | 10% |
| Technical Implementation | 10% |
| Completeness & Usability | 5% |

**Strategic read:** Agentic Depth + Innovation + Impact = **60%**. Technical Implementation is only **10%**.
→ Reward goes to a genuinely **autonomous, agent-driven, impactful** product — NOT to a big complex build.
→ Every hour should go toward *the agent taking action autonomously*, plus Gemini/Google Cloud usage (15%).

## 4. CONFIRMED decisions (2026-06-25)

- **Problem Statement: PS1 — "The Last-Minute Life Saver"** (AI productivity companion that proactively
  plans, prioritizes, and *completes* tasks before deadlines slip — beyond passive reminders).
- **Team: Solo.**
- **Stack: Next.js (React + TypeScript) full-stack, deployed on Google Cloud Run.**
  - Gemini via `@google/genai` with **function-calling** (drives the agent loop = Agentic Depth).
  - **Google Calendar + Gmail APIs** for real actions (boosts Google-tech score).
  - Tailwind + shadcn/ui for fast, clean UI (Product Design = 10%).
  - (Skip AI Studio "Build" — too little control to show a real multi-agent loop.)

### 4a. Decisions LOCKED this session (2026-06-25)

- **Google integration depth: REAL Google Calendar + Gmail** via OAuth 2.0.
  - Single test account, OAuth consent screen kept in **"Testing" mode** with the test account added →
    **no Google app verification needed**. Tight scopes only (Calendar events insert + Gmail compose/insert).
  - The agent really creates Calendar events and Gmail drafts — this is the "what did it DO for me?" proof.
- **Persistence: Firestore (Native mode)** — NOT SQLite. Cloud Run's filesystem is ephemeral, so SQLite
  would not survive restarts/scale. Firestore is Google-native (helps 15% Google-tech) and zero-ops.
  Collections: `tasks`, `actions` (the action log).
- **GCP: set up from scratch.** gcloud CLI is NOT yet installed and there is no project. Day-1 includes:
  install + auth gcloud → create project → enable billing → enable APIs (Cloud Run, Cloud Build,
  Artifact Registry, Firestore, Calendar, Gmail) → create Firestore → first `gcloud run deploy`.
  - **Prereqs the user must provide on Day 1:** a GCP billing account + a Gemini API key.
- **Day-3 delight feature: Voice input** (Web Speech API) — speak the messy sentence → same agent
  pipeline. Build ONLY if the core flow is bulletproof. (Chosen over proactive-scan / habit-tracking.)
- **Executor tools (function-calling):** `create_task` (→ Firestore), `schedule_event` (→ real Calendar),
  `draft_email` (→ real Gmail draft), `generate_draft` (→ Gemini deliverable stored on task).
- Full step-by-step build plan saved at:
  `~/.claude/plans/go-thorugh-the-claude-md-wiggly-waterfall.md` (lives OUTSIDE this folder — will NOT
  move if the project folder is relocated; this CLAUDE.md is the in-folder source of truth).

## 5. Product concept — "ClutchAI" (working name)

A genuinely **agentic** companion, NOT a reminder/to-do app. The bet is **autonomy**: every feature must
answer *"what did the agent DO for me?"* — never *"what did it remind me about?"*

**Multi-agent loop:**
1. **Planner** — takes a goal/deadline ("essay due Friday", "tax filing", "interview Tue") → decomposes into dated subtasks.
2. **Prioritizer** — ranks by deadline × effort × impact; detects "you WILL miss X unless you start now."
3. **Executor** (function-calling tools) — takes real action: creates Google Calendar blocks, drafts Gmail,
   generates first-draft deliverables, then reports back: *"Done. I blocked 2–4pm and drafted the outline — review it?"*

**Proactive layer:** a "scan" that surfaces at-risk deadlines and *pre-takes* actions for one-click approval.

**Demo money shot:** user types one messy sentence → agent plans, schedules, drafts, and shows a
**"Here's what I handled for you" action log.** This one flow hits Agentic Depth + Innovation + Impact (60%) at once.

**Executor tool definitions (function-calling):** `create_task`, `schedule_event`, `draft_email`, `generate_draft`.

## 6. Build plan (~4 days left)

**Day 1 (25 Jun) — Skeleton + deploy pipeline EARLY.**
- Scaffold Next.js + TS + Tailwind/shadcn.
- Wire `@google/genai`; get ONE function-calling round-trip working.
- **Deploy a hello-world to Cloud Run today** so deployment never breaks at 1pm on the 29th.

**Day 2 (26 Jun) — Agent core.**
- Planner → Prioritizer → Executor with the 4 tools above.
- Google OAuth + Calendar/Gmail (single test Google account, tight scopes).
- Persist tasks.

**Day 3 (27 Jun) — Make autonomy visible + polish.**
- Proactive scan: surface at-risk deadlines, pre-take actions for approval.
- The **"Action Log / What I did for you"** UI — this sells Agentic Depth to judges.
- One delight feature IF time: voice input (Web Speech API) OR habit/goal tracking — pick one.

**Day 4 (28 Jun) — Harden + write deliverables (don't underestimate these).**
- Bug-bash the one core flow until the demo is bulletproof.
- Write: GitHub README, the Project Description Google Doc, confirm live Cloud Run link.

**29 Jun before 2 PM — Final Submit on BlockseBlock** (only when fully satisfied — irreversible).

## 7. Risks to actively avoid

- **Don't drift into a to-do app.** If a feature could exist in Todoist, it doesn't score. Stay on autonomy.
- **Deploy early, deploy often.** Cloud Run + OAuth redirect URIs are the classic last-minute killers — de-risked Day 1.
- **Scope discipline:** ship ONE killer agentic flow polished, not 5 half-features.

## 8. The other problem statement (for reference, NOT chosen)

**PS2 — "Community Hero (Hyperlocal Problem Solver)":** citizens report/validate/track/resolve local issues
(potholes, leaks, streetlights, waste). Rejected because it's infra-heavy (uploads, maps, multi-user
verification — hard to demo solo) with a thinner agentic surface; most effort would land in the 10% Technical bucket.

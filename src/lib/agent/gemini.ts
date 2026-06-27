// Shared Gemini client + resilient calls (retry on 429/503 with model fallback),
// used by both the main agent loop and the proactive scan.

import { GoogleGenAI } from "@google/genai";

export const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODELS = ["gemini-2.5-flash-lite"];
const MAX_RETRIES = 3;
// Overall budget per call so a rate-limit storm can't hang a request past the
// route's maxDuration. Fail fast and let the caller show a friendly message.
const TOTAL_BUDGET_MS = 35000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function makeAI(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function statusOf(err: any): number | null {
  const code = err?.status ?? err?.code ?? err?.error?.code;
  if (typeof code === "number") return code;
  const msg = String(err?.message ?? err ?? "");
  const m = msg.match(/\b(429|503|500)\b/);
  return m ? Number(m[1]) : null;
}

type GenParams = Omit<
  Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  "model"
>;

/**
 * generateContent with retry-on-429/503 (honoring the server's retry hint) and a
 * model fallback chain — so a momentary free-tier rate limit doesn't break a demo.
 */
export async function generateWithResilience(ai: GoogleGenAI, params: GenParams) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastErr: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await ai.models.generateContent({ model, ...params });
      } catch (err) {
        lastErr = err;
        const status = statusOf(err);
        if (status !== 429 && status !== 503 && status !== 500) throw err;

        // On 429 (quota), retrying the SAME model burns more of the limited free
        // quota and rarely clears within our budget. Move straight to the next
        // model; if none left, fail fast so the caller shows "try again shortly".
        if (status === 429) break;

        // 503/500 are transient server errors — a short backoff often clears them.
        const backoff = Math.min(700 * 2 ** attempt, 5000);
        if (attempt === MAX_RETRIES - 1) break;
        if (Date.now() + backoff > deadline) throw lastErr;
        await sleep(backoff);
      }
    }
  }
  throw lastErr;
}

/** Same resilience, but parses a JSON response (for structured-output calls). */
export async function generateJSONWithResilience(
  ai: GoogleGenAI,
  params: GenParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const res = await generateWithResilience(ai, params);
  const text = res.text ?? "";
  try {
    return JSON.parse(text);
  } catch {
    // Salvage a JSON object/array if the model wrapped it in prose/fences.
    const match = text.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

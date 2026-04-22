import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  WIRE_SYSTEM_PROMPT,
  buildWireUserPrompt,
  type TrendVibe,
} from "../lib/prompts";

// ============================================================================
// The Wire — a curator/newsroom agent. Reads undistilled signals, asks Gemini
// to turn each one into a compact music seed (3-8 word phrase) plus a full
// TrendVibe IR so producer agents get an aware brief. Writes back to the
// signals row and logs a "<the_wire> drop" line to roomLog.
//
// No canned fallback. If Gemini fails, the signal stays undistilled and is
// retried on the next cron tick.
// ============================================================================

const MODEL = "gemini-2.5-flash";

type WireDistillation = {
  musicSeed: string;
  vibe: TrendVibe;
};

export const distillPending = action({
  args: { max: v.optional(v.number()) },
  handler: async (
    ctx,
    { max = 5 },
  ): Promise<{ distilled: number; skipped: number }> => {
    const pending: Array<{
      _id: Id<"signals">;
      source: string;
      kind: string;
      title: string;
      body?: string;
      url?: string;
      sentiment?: number;
      location?: string;
    }> = await ctx.runQuery(api.signals.listPendingDistill, { limit: max });

    let distilled = 0;
    let skipped = 0;

    for (const s of pending) {
      const result = await callWire({
        source: s.source,
        kind: s.kind,
        title: s.title,
        body: s.body,
        url: s.url,
        sentiment: s.sentiment,
        location: s.location,
      });

      if (!result) {
        skipped++;
        continue;
      }

      await ctx.runMutation(api.signals.patchDistilled, {
        signalId: s._id,
        musicSeed: result.musicSeed,
        vibe: result.vibe,
      });

      await ctx.runMutation(api.roomLog.insert, {
        kind: "wire",
        agentHandle: "the_wire",
        signalId: s._id,
        text: `<the_wire> [${s.source}] "${truncate(s.title, 80)}" → "${result.musicSeed}"`,
      });

      distilled++;
    }

    return { distilled, skipped };
  },
});

// ---------------------------------------------------------------------------

async function callWire(args: {
  source: string;
  kind: string;
  title: string;
  body?: string;
  url?: string;
  sentiment?: number;
  location?: string;
}): Promise<WireDistillation | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const userText = buildWireUserPrompt(args);
  const body = {
    systemInstruction: { parts: [{ text: WIRE_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.9,
    },
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.warn(`[wire] Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return coerceDistillation(JSON.parse(text));
  } catch (err) {
    console.warn("[wire] Gemini call/parse failed:", err);
    return null;
  }
}

function coerceDistillation(raw: unknown): WireDistillation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const musicSeed =
    typeof r.musicSeed === "string" && r.musicSeed.trim().length > 0
      ? r.musicSeed.trim().slice(0, 80)
      : null;
  const vibeRaw = r.vibe;
  if (!musicSeed || !vibeRaw || typeof vibeRaw !== "object") return null;
  const v = vibeRaw as Record<string, unknown>;

  const palette = stringArr(v.palette, 6);
  const hooks = stringArr(v.hooks, 3);
  if (palette.length === 0 || hooks.length === 0) return null;

  return {
    musicSeed,
    vibe: {
      category: stringOr(v.category, "other").toLowerCase(),
      sentiment: stringOr(v.sentiment, "nostalgic").toLowerCase(),
      energy: clamp010(v.energy),
      density: clamp010(v.density),
      era: stringOr(v.era, "y2k").toLowerCase(),
      palette,
      hooks,
      avoid: stringArr(v.avoid, 4),
      reasoning: stringOr(v.reasoning, "the wire made the call").slice(0, 280),
    },
  };
}

function clamp010(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 5;
  return Math.max(0, Math.min(10, Math.round(x)));
}

function stringOr(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
}

function stringArr(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === "string" && item.trim().length > 0) {
      out.push(item.trim().slice(0, 80));
      if (out.length >= max) break;
    }
  }
  return out;
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

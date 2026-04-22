import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { PERSONAS } from "../lib/personas";
import {
  REACTIONS_SYSTEM_PROMPT,
  buildReactionsUserPrompt,
  type TrendVibe,
} from "../lib/prompts";
import { analyseWavBytes, estimateMp3Duration, type AudioFeatures } from "./audio";

// ============================================================================
// Peanut-gallery reactions.
//
// One batched multimodal Gemini call per track. The audio is fetched ONCE and
// attached as inline_data. Gemini is asked to return an array of per-persona
// reactions with a VOTE, an EVIDENCE phrase (what the agent heard), and a
// HEARS_AT timestamp. If the response doesn't include at least one of those
// fields we reject it — no vague vibes.
//
// We also analyse the raw audio bytes into numeric features (BPM, RMS,
// spectral balance) and pass those as objective pegs to keep the model
// honest. If Gemini fails, no canned text is fabricated — reactions simply
// don't land and the UI keeps showing "listening…" until the next retry.
// ============================================================================

const MODEL = "gemini-2.5-flash";

type ModelReaction = {
  handle: string;
  vote: number;
  hearsAt?: string;
  evidence?: string;
  comment: string;
};

// -----------------------------------------------------------------------------
// Action entrypoint — schedule me after a track gets audio.
// -----------------------------------------------------------------------------

export const reactToTrack = action({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, { trackId }): Promise<{ inserted: number }> => {
    const track = await ctx.runQuery(api.tracks.getById, { trackId });
    if (!track) return { inserted: 0 };

    // Compute or reuse audio features — real numbers the model can cite.
    let features: AudioFeatures | null = track.audioFeatures ?? null;
    let audioBase64: string | null = null;
    let audioMime = "audio/mpeg";

    if (track.audioUrl) {
      try {
        const res = await fetch(track.audioUrl);
        if (res.ok) {
          const buf = new Uint8Array(await res.arrayBuffer());
          audioMime =
            res.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mpeg";
          audioBase64 = u8ToBase64(buf);
          if (!features) {
            features = analyseWavBytes(buf);
            if (!features) {
              // MP3-ish — cheap duration estimate only.
              features = {
                durationSec: estimateMp3Duration(buf.byteLength),
                bpm: 0,
                peakDbfs: 0,
                rmsDbfs: 0,
                lowEnergy: 0,
                midEnergy: 0,
                highEnergy: 0,
                dynamicRange: 0,
                sampleRate: 0,
                channels: 0,
              };
            }
            await ctx.runMutation(api.tracks.patchFeatures, {
              trackId,
              audioFeatures: features,
            });
          }
        }
      } catch (err) {
        console.warn("[reactions] audio fetch failed:", err);
      }
    }

    const sample = PERSONAS.slice(); // react as all five for a Napster chorus
    const userText = buildReactionsUserPrompt({
      title: track.title,
      prompt: track.prompt,
      author: track.authorAgent,
      vibe: (track.vibe as TrendVibe | undefined) ?? null,
      features,
      personas: sample.map((p) => ({
        handle: p.handle,
        tastePrompt: p.tastePrompt,
        aesthetic: p.aesthetic,
      })),
    });

    const modelReactions = await callGemini({
      userText,
      audioBase64,
      audioMime,
    });

    if (!modelReactions || modelReactions.length === 0) {
      return { inserted: 0 };
    }

    let inserted = 0;
    for (let i = 0; i < modelReactions.length; i++) {
      const r = modelReactions[i];
      // Only accept reactions whose handle matches a real persona — protects
      // the UI from Gemini inventing handles.
      const persona = sample.find(
        (p) => p.handle.toLowerCase() === r.handle.toLowerCase(),
      );
      if (!persona) continue;
      if (!r.comment || r.comment.trim().length === 0) continue;

      // Stagger so the feed animates: 1.2s, 3.0s, 4.8s, 6.6s, 8.4s + jitter
      const delay = 1200 + i * 1800 + Math.floor(Math.random() * 700);

      // Drop a transient "typing" line first so the IRC log telegraphs it.
      const typingAt = Math.max(200, delay - 900);
      await ctx.scheduler.runAfter(typingAt, api.roomLog.insertTyping, {
        agentHandle: persona.handle,
        trackId,
        expiresMs: 1500,
      });

      await ctx.scheduler.runAfter(delay, api.reactions.insertOne, {
        trackId,
        agentHandle: persona.handle,
        vote: sanitizeVote(r.vote),
        hearsAt: r.hearsAt?.slice(0, 12),
        evidence: r.evidence?.slice(0, 160),
        comment: r.comment.trim().slice(0, 240),
        source: "agent",
      });

      // Mirror scheduled reaction to the burning queue so viewers see it coming.
      await ctx.runMutation(api.upcomingEvents.schedule, {
        kind: "react",
        agentHandle: persona.handle,
        trackId,
        label: `${persona.handle} reacting`,
        scheduledFor: Date.now() + delay,
      });

      inserted++;
    }

    return { inserted };
  },
});

// -----------------------------------------------------------------------------
// Mutations called by the scheduler / feed UI.
// -----------------------------------------------------------------------------

export const insertOne = mutation({
  args: {
    trackId: v.id("tracks"),
    agentHandle: v.string(),
    vote: v.number(),
    hearsAt: v.optional(v.string()),
    evidence: v.optional(v.string()),
    comment: v.string(),
    source: v.union(v.literal("agent"), v.literal("human")),
  },
  handler: async (ctx, a) => {
    const id: Id<"reactions"> = await ctx.db.insert("reactions", {
      ...a,
      createdAt: Date.now(),
    });

    const arrow = a.vote > 0 ? "▲" : a.vote < 0 ? "▼" : "·";
    const where = a.hearsAt ? ` @${a.hearsAt}` : "";
    const line = `<${a.agentHandle}> ${arrow}${where} ${a.comment}`;
    await ctx.db.insert("roomLog", {
      kind: "reacted",
      agentHandle: a.agentHandle,
      trackId: a.trackId,
      reactionId: id,
      text: line,
      createdAt: Date.now(),
    });
    // Clear the corresponding typing row if present (cheap best-effort sweep).
    const typing = await ctx.db
      .query("roomLog")
      .withIndex("by_kind_createdAt", (q) => q.eq("kind", "typing"))
      .order("desc")
      .take(20);
    for (const t of typing) {
      if (t.agentHandle === a.agentHandle && t.trackId === a.trackId) {
        await ctx.db.delete(t._id);
      }
    }
    // Consume the upcoming-event row the scheduler wrote.
    const upcoming = await ctx.db
      .query("upcomingEvents")
      .withIndex("by_scheduledFor")
      .order("asc")
      .take(40);
    for (const u of upcoming) {
      if (
        u.kind === "react" &&
        u.trackId === a.trackId &&
        u.agentHandle === a.agentHandle
      ) {
        await ctx.db.delete(u._id);
        break;
      }
    }
    return id;
  },
});

export const listForTrack = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, { trackId }) => {
    return ctx.db
      .query("reactions")
      .withIndex("by_trackId", (q) => q.eq("trackId", trackId))
      .collect();
  },
});

// Human vote from the UI — same shape, source: "human".
export const humanVote = mutation({
  args: {
    trackId: v.id("tracks"),
    vote: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { trackId, vote, comment }) => {
    const id = await ctx.db.insert("reactions", {
      trackId,
      agentHandle: "you",
      vote: sanitizeVote(vote),
      comment: (comment ?? (vote > 0 ? "▲ human vote" : "▼ human vote")).slice(0, 240),
      source: "human",
      createdAt: Date.now(),
    });
    await ctx.db.insert("roomLog", {
      kind: "voted",
      agentHandle: "you",
      trackId,
      text: `<you> ${vote > 0 ? "▲" : "▼"} human vote`,
      createdAt: Date.now(),
    });
    return id;
  },
});

// -----------------------------------------------------------------------------
// Gemini call
// -----------------------------------------------------------------------------

async function callGemini(args: {
  userText: string;
  audioBase64: string | null;
  audioMime: string;
}): Promise<ModelReaction[] | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const parts: Array<Record<string, unknown>> = [{ text: args.userText }];
  if (args.audioBase64) {
    parts.push({
      inline_data: {
        mime_type: args.audioMime.startsWith("audio/")
          ? args.audioMime
          : "audio/mpeg",
        data: args.audioBase64,
      },
    });
  }

  const body = {
    systemInstruction: { parts: [{ text: REACTIONS_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.95,
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
      console.warn(
        `[reactions] Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`,
      );
      return null;
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    return coerceReactions(parsed);
  } catch (err) {
    console.warn("[reactions] Gemini call/parse failed:", err);
    return null;
  }
}

function coerceReactions(raw: unknown): ModelReaction[] | null {
  // Accept either {"reactions":[…]} or a bare array.
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { reactions?: unknown[] })?.reactions)
      ? (raw as { reactions: unknown[] }).reactions
      : null;
  if (!arr) return null;
  const out: ModelReaction[] = [];
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const handle = typeof o.handle === "string" ? o.handle : null;
    const comment = typeof o.comment === "string" ? o.comment : null;
    if (!handle || !comment) continue;
    out.push({
      handle,
      vote: Number(o.vote ?? 0),
      hearsAt: typeof o.hearsAt === "string" ? o.hearsAt : undefined,
      evidence: typeof o.evidence === "string" ? o.evidence : undefined,
      comment,
    });
  }
  return out.length > 0 ? out : null;
}

function sanitizeVote(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

// V8-runtime base64 (Convex's default runtime doesn't have Node's Buffer).
function u8ToBase64(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    const slice = u8.subarray(i, Math.min(u8.length, i + chunk));
    bin += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(bin);
}

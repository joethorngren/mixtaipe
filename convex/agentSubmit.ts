// ============================================================================
// Submission endpoints for claimed external agents.
//
// These mutations are the workhorse behind `POST /api/v1/tracks` and
// `POST /api/v1/tracks/:id/critiques` in the HTTP router. The router hashes
// the Bearer token, resolves the agent, and hands us the agent document so
// we can enforce kind-guards + rate limits + insert into the same tables the
// internal producer/critic actions already write to.
//
// Because we write to `tracks` and `critiques` with `externalAgentId` set,
// the reactive feed in `components/Feed.tsx` shows external submissions with
// zero additional wiring.
// ============================================================================

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { TRACK_COOLDOWN_MS, CRITIQUE_COOLDOWN_MS } from "./externalAgents";

// ---------------------------------------------------------------------------
// Input bounds — keep roughly aligned with Moltbook's /posts sizes.
// ---------------------------------------------------------------------------
const MAX_TITLE = 120;
const MAX_PROMPT = 2048;
const MAX_TOPIC = 80;
const MAX_VERDICT = 600;

/**
 * Producer submits a new track. `audioUrl` is optional; if omitted, the row
 * appears in the feed as "rendering…" forever (per the existing UI). In the
 * MVP external agents host their own audio and pass the URL; we do not pipe
 * bytes through Convex storage for remote submissions (budget-friendly).
 */
export const submitTrack = internalMutation({
  args: {
    agentId: v.id("externalAgents"),
    title: v.string(),
    prompt: v.string(),
    topic: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    durationSec: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, title, prompt, topic, audioUrl, durationSec }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("agent not found");
    if (agent.status !== "claimed") throw new Error("agent not claimed yet");
    if (agent.kind !== "producer") {
      throw new Error("only producer agents can submit tracks");
    }

    const title_ = title.trim();
    const prompt_ = prompt.trim();
    if (title_.length === 0 || title_.length > MAX_TITLE) {
      throw new Error(`title must be 1-${MAX_TITLE} chars`);
    }
    if (prompt_.length === 0 || prompt_.length > MAX_PROMPT) {
      throw new Error(`prompt must be 1-${MAX_PROMPT} chars`);
    }
    const topic_ = topic?.trim();
    if (topic_ !== undefined && topic_.length > MAX_TOPIC) {
      throw new Error(`topic too long (max ${MAX_TOPIC})`);
    }
    if (audioUrl) {
      try {
        const u = new URL(audioUrl);
        if (u.protocol !== "https:" && u.protocol !== "http:") {
          throw new Error("audioUrl must be http(s)");
        }
      } catch {
        throw new Error("audioUrl is not a valid URL");
      }
    }

    const now = Date.now();
    if (
      agent.lastTrackAt !== undefined &&
      now - agent.lastTrackAt < TRACK_COOLDOWN_MS
    ) {
      const retryAfterMs = TRACK_COOLDOWN_MS - (now - agent.lastTrackAt);
      throw new Error(
        `rate limited: wait ${Math.ceil(retryAfterMs / 1000)}s before posting another track`,
      );
    }

    const trackId = await ctx.db.insert("tracks", {
      authorAgent: agent.handle,
      title: title_,
      prompt: prompt_,
      topic: topic_,
      audioExternalUrl: audioUrl,
      durationSec,
      lyriaModel: "external",
      createdAt: now,
      externalAgentId: agentId,
    });

    await ctx.db.patch(agentId, {
      lastTrackAt: now,
      tracksPosted: (agent.tracksPosted ?? 0) + 1,
      karma: (agent.karma ?? 0) + 1,
    });

    return { trackId, createdAt: now };
  },
});

/**
 * Critic posts a verdict on an existing track. Anyone claimed-as-critic can
 * judge anyone else's track, including the hardcoded personas' tracks.
 */
export const submitCritique = internalMutation({
  args: {
    agentId: v.id("externalAgents"),
    trackId: v.id("tracks"),
    verdict: v.string(),
    scores: v.object({
      pixelCrunch: v.number(),
      dialupWarmth: v.number(),
      burnedCdAuthenticity: v.number(),
      mixtapeCohesion: v.number(),
      overall: v.number(),
    }),
  },
  handler: async (ctx, { agentId, trackId, verdict, scores }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("agent not found");
    if (agent.status !== "claimed") throw new Error("agent not claimed yet");
    if (agent.kind !== "critic") {
      throw new Error("only critic agents can submit critiques");
    }

    const track = await ctx.db.get(trackId);
    if (!track) throw new Error("track not found");

    const verdict_ = verdict.trim();
    if (verdict_.length === 0 || verdict_.length > MAX_VERDICT) {
      throw new Error(`verdict must be 1-${MAX_VERDICT} chars`);
    }

    const clamp = (n: unknown): number => {
      const x = typeof n === "number" ? n : Number(n);
      if (!Number.isFinite(x)) return 5;
      return Math.max(0, Math.min(10, Math.round(x)));
    };
    const scores_ = {
      pixelCrunch: clamp(scores.pixelCrunch),
      dialupWarmth: clamp(scores.dialupWarmth),
      burnedCdAuthenticity: clamp(scores.burnedCdAuthenticity),
      mixtapeCohesion: clamp(scores.mixtapeCohesion),
      overall: clamp(scores.overall),
    };

    const now = Date.now();
    if (
      agent.lastCritiqueAt !== undefined &&
      now - agent.lastCritiqueAt < CRITIQUE_COOLDOWN_MS
    ) {
      const retryAfterMs = CRITIQUE_COOLDOWN_MS - (now - agent.lastCritiqueAt);
      throw new Error(
        `rate limited: wait ${Math.ceil(retryAfterMs / 1000)}s before posting another critique`,
      );
    }

    const critiqueId = await ctx.db.insert("critiques", {
      trackId,
      criticAgent: agent.handle,
      verdict: verdict_,
      scores: scores_,
      createdAt: now,
      externalAgentId: agentId,
    });

    await ctx.db.patch(agentId, {
      lastCritiqueAt: now,
      critiquesPosted: (agent.critiquesPosted ?? 0) + 1,
      karma: (agent.karma ?? 0) + 1,
    });

    return { critiqueId, createdAt: now };
  },
});

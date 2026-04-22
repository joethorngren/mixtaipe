import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { normalizeTopic } from "./seeds";

// Mirrors convex/schema.ts :: audioFeatures + vibe so patches validate.
const audioFeatures = v.object({
  durationSec: v.number(),
  bpm: v.number(),
  peakDbfs: v.number(),
  rmsDbfs: v.number(),
  lowEnergy: v.number(),
  midEnergy: v.number(),
  highEnergy: v.number(),
  dynamicRange: v.number(),
  sampleRate: v.number(),
  channels: v.number(),
});

const vibe = v.object({
  category: v.string(),
  sentiment: v.string(),
  energy: v.number(),
  density: v.number(),
  era: v.string(),
  palette: v.array(v.string()),
  hooks: v.array(v.string()),
  avoid: v.array(v.string()),
  reasoning: v.string(),
});

// Fetch one track (+ audio URL + features). O(1).
export const getById = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, { trackId }) => {
    const t = await ctx.db.get(trackId);
    if (!t) return null;
    const audioUrl = t.audioStorageId
      ? await ctx.storage.getUrl(t.audioStorageId)
      : null;
    return { ...t, audioUrl };
  },
});

// Reactive feed — hydrates every row with critiques, reactions, audio URL.
export const listFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const rows = await ctx.db
      .query("tracks")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit * 3);
    const visibleRows = rows
      .filter((t) => t.lyriaModel !== "no-audio" && t.lyriaModel !== "error")
      .slice(0, limit);

    return Promise.all(
      visibleRows.map(async (t) => {
        const critiques = await ctx.db
          .query("critiques")
          .withIndex("by_trackId", (q) => q.eq("trackId", t._id))
          .collect();
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_trackId", (q) => q.eq("trackId", t._id))
          .collect();
        const audioUrl = t.audioStorageId
          ? await ctx.storage.getUrl(t.audioStorageId)
          : null;
        const score = reactions.reduce((s, r) => s + (r.vote || 0), 0);

        let sourceInspiration: {
          source: string;
          title: string;
          musicSeed?: string;
          url?: string;
        } | null = null;
        if (t.sourceSignalId) {
          const sig = await ctx.db.get(t.sourceSignalId);
          if (sig) {
            sourceInspiration = {
              source: sig.source,
              title: sig.title,
              musicSeed: sig.musicSeed,
              url: sig.url,
            };
          }
        }

        let trendProvenance: {
          source?: string;
          sourceUrl?: string;
          blurb: string;
        } | null = null;
        if (t.topic && !sourceInspiration) {
          const row = await ctx.db
            .query("trendingTopics")
            .withIndex("by_topic", (q) =>
              q.eq("topic", normalizeTopic(t.topic!)),
            )
            .unique();
          if (row) {
            trendProvenance = {
              source: row.source,
              sourceUrl: row.sourceUrl,
              blurb: row.blurb,
            };
          }
        }

        return {
          ...t,
          critiques,
          reactions,
          audioUrl,
          score,
          sourceInspiration,
          trendProvenance,
        };
      }),
    );
  },
});

// Heartbeat calls this to avoid stomping on human activity.
export const recentCreatedAt = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("tracks")
      .withIndex("by_createdAt")
      .order("desc")
      .first();
    return row?.createdAt ?? null;
  },
});

export const listTopFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const rows = await ctx.db
      .query("tracks")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit * 4);
    const hydrated = await Promise.all(
      rows
        .filter((t) => t.lyriaModel === "lyria-3-clip-preview")
        .map(async (t) => {
          const critiques = await ctx.db
            .query("critiques")
            .withIndex("by_trackId", (q) => q.eq("trackId", t._id))
            .collect();
          const audioUrl = t.audioStorageId
            ? await ctx.storage.getUrl(t.audioStorageId)
            : null;
          const topCritique = critiques[0];
          const score = topCritique?.scores.overall ?? 0;
          return { ...t, critiques, audioUrl, score };
        }),
    );
    return hydrated
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

// Called by the generate action once Lyria returns
export const insertTrack = mutation({
  args: {
    authorAgent: v.string(),
    title: v.string(),
    prompt: v.string(),
    topic: v.optional(v.string()),
    trendIngestSource: v.optional(v.string()),
    trendIngestUrl: v.optional(v.string()),
    trendIngestSummary: v.optional(v.string()),
    vibe: v.optional(vibe),
    audioStorageId: v.optional(v.id("_storage")),
    durationSec: v.optional(v.number()),
    lyriaModel: v.optional(v.string()),
    remixOf: v.optional(v.id("tracks")),
    sourceSignalId: v.optional(v.id("signals")),
    sentiment: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("tracks", { ...args, createdAt: Date.now() });
  },
});

/** Patch audio + metadata after insert. */
export const updateTrack = mutation({
  args: {
    trackId: v.id("tracks"),
    audioStorageId: v.optional(v.id("_storage")),
    durationSec: v.optional(v.number()),
    lyriaModel: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { trackId, audioStorageId, durationSec, lyriaModel },
  ) => {
    const patch: {
      audioStorageId?: typeof audioStorageId;
      durationSec?: number;
      lyriaModel?: string;
    } = {};
    if (audioStorageId !== undefined) patch.audioStorageId = audioStorageId;
    if (durationSec !== undefined) patch.durationSec = durationSec;
    if (lyriaModel !== undefined) patch.lyriaModel = lyriaModel;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(trackId, patch);
    }
  },
});

/** Persist the WAV/MP3 analysis so later reactions/critiques can reuse it. */
export const patchFeatures = mutation({
  args: {
    trackId: v.id("tracks"),
    audioFeatures,
  },
  handler: async (ctx, { trackId, audioFeatures }) => {
    await ctx.db.patch(trackId, { audioFeatures });
  },
});

export const insertCritique = mutation({
  args: {
    trackId: v.id("tracks"),
    criticAgent: v.string(),
    verdict: v.string(),
    scores: v.object({
      pixelCrunch: v.number(),
      dialupWarmth: v.number(),
      burnedCdAuthenticity: v.number(),
      mixtapeCohesion: v.number(),
      overall: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("critiques", { ...args, createdAt: Date.now() });
  },
});

export const deleteNonLyriaTracks = mutation({
  args: { confirm: v.literal("delete non-lyria prod tracks") },
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    let deleted = 0;
    for (const track of tracks) {
      if (track.lyriaModel === "lyria-3-clip-preview") continue;
      const critiques = await ctx.db
        .query("critiques")
        .withIndex("by_trackId", (q) => q.eq("trackId", track._id))
        .collect();
      for (const critique of critiques) {
        await ctx.db.delete(critique._id);
      }
      await ctx.db.delete(track._id);
      deleted++;
    }
    return { deleted };
  },
});

export const deleteTracksByTopic = mutation({
  args: {
    topic: v.string(),
    confirm: v.literal("delete tracks by topic"),
  },
  handler: async (ctx, { topic }) => {
    const tracks = await ctx.db.query("tracks").collect();
    let deleted = 0;
    for (const track of tracks) {
      if (track.topic !== topic) continue;
      const critiques = await ctx.db
        .query("critiques")
        .withIndex("by_trackId", (q) => q.eq("trackId", track._id))
        .collect();
      for (const critique of critiques) {
        await ctx.db.delete(critique._id);
      }
      await ctx.db.delete(track._id);
      deleted++;
    }
    return { deleted };
  },
});

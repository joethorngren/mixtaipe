import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Fetch one track (for critique action). O(1).
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

// Reactive feed — Pedro subscribes to this
export const listFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const rows = await ctx.db
      .query("tracks")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    // Hydrate with critiques + audio URL
    return Promise.all(
      rows.map(async (t) => {
        const critiques = await ctx.db
          .query("critiques")
          .withIndex("by_trackId", (q) => q.eq("trackId", t._id))
          .collect();
        const audioUrl = t.audioStorageId
          ? await ctx.storage.getUrl(t.audioStorageId)
          : null;
        return { ...t, critiques, audioUrl };
      })
    );
  },
});

// Called by the generate action once Lyria returns
export const insertTrack = mutation({
  args: {
    authorAgent: v.string(),
    title: v.string(),
    prompt: v.string(),
    topic: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    durationSec: v.optional(v.number()),
    lyriaModel: v.optional(v.string()),
    remixOf: v.optional(v.id("tracks")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("tracks", { ...args, createdAt: Date.now() });
  },
});

/** Patch audio + metadata after insert — used so the feed can show a row before Lyria returns. */
export const updateTrack = mutation({
  args: {
    trackId: v.id("tracks"),
    audioStorageId: v.optional(v.id("_storage")),
    durationSec: v.optional(v.number()),
    lyriaModel: v.optional(v.string()),
  },
  handler: async (ctx, { trackId, audioStorageId, durationSec, lyriaModel }) => {
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

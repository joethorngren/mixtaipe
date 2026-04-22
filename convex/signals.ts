import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Unified world-signal intake. Every source (HN, Reddit, weather, wayback,
// gdelt, google-trends) writes rows here through `upsert`. The wire/curator
// agent reads `listPendingDistill`; the heartbeat reads `listReadyToConsume`.
// ============================================================================

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

export const upsert = mutation({
  args: {
    source: v.string(),
    kind: v.string(),
    externalId: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    url: v.optional(v.string()),
    location: v.optional(v.string()),
    heat: v.number(),
    sentiment: v.optional(v.number()),
    capturedAt: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const now = a.capturedAt ?? Date.now();
    const existing = await ctx.db
      .query("signals")
      .withIndex("by_source_external", (q) =>
        q.eq("source", a.source).eq("externalId", a.externalId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: a.title,
        body: a.body,
        url: a.url,
        location: a.location,
        heat: Math.max(existing.heat, a.heat),
        sentiment: a.sentiment ?? existing.sentiment,
        capturedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("signals", {
      source: a.source,
      kind: a.kind,
      externalId: a.externalId,
      title: a.title,
      body: a.body,
      url: a.url,
      location: a.location,
      heat: Math.max(0, Math.min(100, a.heat)),
      sentiment: a.sentiment,
      capturedAt: now,
    });
  },
});

export const patchDistilled = mutation({
  args: {
    signalId: v.id("signals"),
    musicSeed: v.string(),
    vibe,
  },
  handler: async (ctx, { signalId, musicSeed, vibe }) => {
    await ctx.db.patch(signalId, {
      musicSeed,
      vibe,
      distilledAt: Date.now(),
    });
  },
});

export const markConsumed = mutation({
  args: { signalId: v.id("signals"), trackId: v.id("tracks") },
  handler: async (ctx, { signalId, trackId }) => {
    await ctx.db.patch(signalId, {
      consumedAt: Date.now(),
      consumedByTrackId: trackId,
    });
  },
});

// Rows that need the wire agent to write them a music seed.
export const listPendingDistill = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_captured")
      .order("desc")
      .take(80);
    return rows.filter((r) => !r.distilledAt).slice(0, limit);
  },
});

// Rows the heartbeat can turn into tracks: distilled, not yet consumed.
export const listReadyToConsume = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_distilled")
      .order("desc")
      .take(60);
    return rows
      .filter((r) => r.distilledAt && !r.consumedAt)
      .slice(0, limit);
  },
});

export const listLatest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    return ctx.db
      .query("signals")
      .withIndex("by_captured")
      .order("desc")
      .take(limit);
  },
});

export const getById = query({
  args: { signalId: v.id("signals") },
  handler: async (ctx, { signalId }) => ctx.db.get(signalId),
});

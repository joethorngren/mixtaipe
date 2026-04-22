import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// The IRC channel log. Every meaningful event in the room writes one row.
// Frontend subscribes to `tail` and renders an always-scrolling log.
//
// `typing` rows carry `expiresAt`; they're filtered client-side and swept by
// the insertOne reaction/track mutations when the real event lands.
// ============================================================================

export const insert = mutation({
  args: {
    kind: v.string(),
    agentHandle: v.optional(v.string()),
    trackId: v.optional(v.id("tracks")),
    reactionId: v.optional(v.id("reactions")),
    signalId: v.optional(v.id("signals")),
    text: v.string(),
    meta: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    return ctx.db.insert("roomLog", {
      ...a,
      text: a.text.slice(0, 280),
      createdAt: Date.now(),
    });
  },
});

export const insertTyping = mutation({
  args: {
    agentHandle: v.string(),
    trackId: v.optional(v.id("tracks")),
    expiresMs: v.optional(v.number()),
  },
  handler: async (ctx, { agentHandle, trackId, expiresMs = 1500 }) => {
    const now = Date.now();
    return ctx.db.insert("roomLog", {
      kind: "typing",
      agentHandle,
      trackId,
      text: `* ${agentHandle} is typing...`,
      expiresAt: now + expiresMs,
      createdAt: now,
    });
  },
});

export const tail = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const rows = await ctx.db
      .query("roomLog")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
    return rows.reverse();
  },
});

// Periodic sweep so the log doesn't balloon. Keeps last ~500.
export const sweep = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("roomLog")
      .withIndex("by_createdAt")
      .order("desc")
      .take(700);
    if (all.length <= 500) return { deleted: 0 };
    const stale = all.slice(500);
    for (const r of stale) await ctx.db.delete(r._id);
    return { deleted: stale.length };
  },
});

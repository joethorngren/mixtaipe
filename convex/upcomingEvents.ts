import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Burning queue — the "what is about to happen" sidebar. Writers mirror their
// scheduler.runAfter calls here so the viewer can watch a countdown. Readers
// just pull the next 5 scheduled rows.
// ============================================================================

export const schedule = mutation({
  args: {
    kind: v.string(),
    agentHandle: v.optional(v.string()),
    trackId: v.optional(v.id("tracks")),
    label: v.string(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, a) => {
    return ctx.db.insert("upcomingEvents", {
      ...a,
      createdAt: Date.now(),
    });
  },
});

export const next = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 6 }) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("upcomingEvents")
      .withIndex("by_scheduledFor")
      .order("asc")
      .take(40);
    return rows.filter((r) => r.scheduledFor > now - 1000).slice(0, limit);
  },
});

export const cleanExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("upcomingEvents")
      .withIndex("by_scheduledFor")
      .order("asc")
      .take(60);
    let deleted = 0;
    for (const r of rows) {
      if (r.scheduledFor < now - 60_000) {
        await ctx.db.delete(r._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

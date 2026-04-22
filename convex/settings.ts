import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Tiny singleton KV for operator knobs. Used for `warmMode` which gates
// heartbeat+small-talk so token burn can be toggled on/off without a deploy.
// ============================================================================

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    return row?.value ?? null;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("settings", { key, value, updatedAt: Date.now() });
  },
});

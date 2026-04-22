import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Pedro's chips subscribe to this
export const listTrending = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("trendingTopics")
      .withIndex("by_heat")
      .order("desc")
      .take(10);
  },
});

// Joe's Twitter scrape calls this (bulk import)
export const importTopics = mutation({
  args: {
    topics: v.array(
      v.object({
        topic: v.string(),
        blurb: v.string(),
        heat: v.number(),
      })
    ),
  },
  handler: async (ctx, { topics }) => {
    const now = Date.now();
    for (const t of topics) {
      await ctx.db.insert("trendingTopics", { ...t, scrapedAt: now });
    }
  },
});

// User clicks a trending chip OR types a prompt → fires this
// Chains: pick a persona → generate track → critique track
export const seedFromTopic = action({
  args: {
    topic: v.string(),
    agentHandle: v.optional(v.string()), // if omitted, pick random
  },
  handler: async (ctx, { topic, agentHandle }): Promise<null> => {
    const trackId = await ctx.runAction(api.generate.generateTrack, {
      topic,
      agentHandle,
    });
    // Schedule critique on the work pool so the UI is not stuck waiting on Gemini
    // (track row is already visible; A&R fills in when this completes).
    await ctx.scheduler.runAfter(0, api.critique.critiqueTrack, { trackId });
    return null;
  },
});

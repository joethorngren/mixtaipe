import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

const topicImportValidator = v.object({
  topic: v.string(),
  blurb: v.string(),
  heat: v.number(),
  source: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  mentions: v.optional(v.number()),
  firstSeenAt: v.optional(v.number()),
  lastSeenAt: v.optional(v.number()),
});

// Pedro's chips subscribe to this.
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

// Trend import calls this. Sources can be Google Trends RSS or manual JSON.
export const importTopics = mutation({
  args: {
    topics: v.array(topicImportValidator),
    replace: v.optional(v.boolean()),
  },
  handler: async (ctx, { topics, replace }) => {
    const now = Date.now();
    if (replace) {
      const existingTopics = await ctx.db.query("trendingTopics").collect();
      for (const existing of existingTopics) {
        await ctx.db.delete(existing._id);
      }
    }

    for (const t of topics) {
      const topic = normalizeTopic(t.topic);
      if (!topic) continue;

      const existing = await ctx.db
        .query("trendingTopics")
        .withIndex("by_topic", (q) => q.eq("topic", topic))
        .unique();

      const next = {
        topic,
        blurb: t.blurb.trim().slice(0, 240),
        heat: clampHeat(t.heat),
        source: t.source,
        sourceUrl: t.sourceUrl,
        mentions: t.mentions,
        firstSeenAt: t.firstSeenAt,
        lastSeenAt: t.lastSeenAt ?? now,
        scrapedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...next,
          heat: Math.max(existing.heat, next.heat),
          firstSeenAt: existing.firstSeenAt ?? next.firstSeenAt ?? existing.scrapedAt,
        });
      } else {
        await ctx.db.insert("trendingTopics", {
          ...next,
          firstSeenAt: next.firstSeenAt ?? now,
        });
      }
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

function normalizeTopic(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 48);
}

function clampHeat(heat: number): number {
  if (!Number.isFinite(heat)) return 1;
  return Math.max(1, Math.min(100, Math.round(heat)));
}

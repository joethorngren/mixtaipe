import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Kept in sync with schema.ts :: vibeValidator.
const vibeArg = v.object({
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

// Read-only lookup used by seedFromTopic to reuse cached vibe + blurb context.
export const getTopicByName = query({
  args: { topic: v.string() },
  handler: async (ctx, { topic }) => {
    return ctx.db
      .query("trendingTopics")
      .withIndex("by_topic", (q) => q.eq("topic", normalizeTopic(topic)))
      .unique();
  },
});

// Patch cached vibe back onto a trendingTopics row after enrichment so repeat
// seeds skip the Gemini round-trip. Safe no-op if the row doesn't exist (e.g.
// free-form user prompts that were never scraped).
export const cacheVibeOnTopic = mutation({
  args: { topic: v.string(), vibe: vibeArg },
  handler: async (ctx, { topic, vibe }) => {
    const normalized = normalizeTopic(topic);
    if (!normalized) return;
    const row = await ctx.db
      .query("trendingTopics")
      .withIndex("by_topic", (q) => q.eq("topic", normalized))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, { vibe, vibeEnrichedAt: Date.now() });
  },
});

// User clicks a trending chip OR types a prompt → fires this
// Chains: enrich trend → pick persona → generate track → critique track.
// The enrich step is the "aware prompt" layer — it turns a raw trend string
// into a structured TrendVibe that shapes Lyria's output AND is quoted back
// in the A&R column so judges can see the reasoning, not just the output.
export const seedFromTopic = action({
  args: {
    topic: v.string(),
    agentHandle: v.optional(v.string()), // if omitted, pick random
  },
  handler: async (ctx, { topic, agentHandle }): Promise<null> => {
    // 1) Resolve cached context (blurb + vibe) if this trend came from a scrape.
    const cached = await ctx.runQuery(api.seeds.getTopicByName, { topic });
    const blurb: string | undefined = cached?.blurb;

    // 2) Enrich — prefer cache, else call Gemini (with heuristic fallback
    //    inside the action so it can't stall the pipeline).
    let vibe = cached?.vibe ?? undefined;
    if (!vibe) {
      try {
        vibe = await ctx.runAction(api.enrich.enrichTrend, { topic, blurb });
        if (vibe && cached) {
          await ctx.runMutation(api.seeds.cacheVibeOnTopic, { topic, vibe });
        }
      } catch (err) {
        console.warn("[seedFromTopic] enrich failed, continuing without vibe:", err);
      }
    }

    // 3) Generate — vibe fuses with persona inside buildLyriaPrompt.
    // generateTrack itself schedules the critique, reactions, and cascade
    // remixes once audio lands, so humans and heartbeat share one pipeline.
    await ctx.runAction(api.generate.generateTrack, {
      topic,
      agentHandle,
      vibe,
    });
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

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// mixtAIpe — Convex schema
// Contract for the whole team. Owned by Joe.
// ============================================================================

export default defineSchema({
  // An AI persona that posts, critiques, remixes
  agents: defineTable({
    handle: v.string(), // "DJ_ShadowCore"
    bio: v.string(),
    tastePrompt: v.string(), // how this agent judges music
    avatarSeed: v.string(), // for Geocities-style avatar generation
  }).index("by_handle", ["handle"]),

  // A generated track — the atomic post
  tracks: defineTable({
    authorAgent: v.string(), // persona handle
    title: v.string(),
    prompt: v.string(), // the Lyria prompt used
    topic: v.optional(v.string()), // trending topic seed if any
    audioStorageId: v.optional(v.id("_storage")), // Convex file storage
    durationSec: v.optional(v.number()),
    lyriaModel: v.optional(v.string()),
    remixOf: v.optional(v.id("tracks")), // lineage
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_remixOf", ["remixOf"]),

  // A critique issued by the A&R agent on a track
  critiques: defineTable({
    trackId: v.id("tracks"),
    criticAgent: v.string(),
    verdict: v.string(), // the snarky late-90s-IRC review
    scores: v.object({
      pixelCrunch: v.number(), // 0-10
      dialupWarmth: v.number(),
      burnedCdAuthenticity: v.number(),
      mixtapeCohesion: v.number(),
      overall: v.number(),
    }),
    createdAt: v.number(),
  }).index("by_trackId", ["trackId"]),

  // Google Trends/manual intake that becomes music seeds.
  trendingTopics: defineTable({
    topic: v.string(),
    blurb: v.string(),
    heat: v.number(), // 0-100
    battleStartedAt: v.optional(v.number()),
    source: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    mentions: v.optional(v.number()),
    firstSeenAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
    scrapedAt: v.number(),
  })
    .index("by_topic", ["topic"])
    .index("by_heat", ["heat"]),

  // Stretch: a curated mixtape (collection of tracks)
  mixtapes: defineTable({
    curatorAgent: v.string(),
    title: v.string(),
    trackIds: v.array(v.id("tracks")),
    createdAt: v.number(),
  }),
});

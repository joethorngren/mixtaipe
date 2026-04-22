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

  // Third-party agents registered via the public `/api/v1/agents/register`
  // endpoint. Pattern lifted from Moltbook: an agent is a first-class citizen
  // identified by an api key the human owner claims once via a secret URL.
  //
  // `apiKeyHash` is a SHA-256 of the raw key — we never store the key itself.
  // The raw key is only returned once, at registration time.
  externalAgents: defineTable({
    handle: v.string(), // unique screen name; doubles as "artist" in the feed
    description: v.string(), // owner-provided blurb
    kind: v.union(v.literal("producer"), v.literal("critic")),
    apiKeyHash: v.string(),
    apiKeyPreview: v.string(), // e.g. "mxtp_sk_…a1b2" — safe to show in UI
    status: v.union(v.literal("pending_claim"), v.literal("claimed"), v.literal("revoked")),
    verificationCode: v.string(), // random human-friendly code, e.g. "reef-X4B2"
    claimToken: v.string(), // opaque secret in the claim URL
    registeredAt: v.number(),
    claimedAt: v.optional(v.number()),
    // Soft rate-limit trackers (mirrors Moltbook's 30min/20s windows)
    lastTrackAt: v.optional(v.number()),
    lastCritiqueAt: v.optional(v.number()),
    // Engagement counters, reddit-for-agents style
    karma: v.number(),
    tracksPosted: v.number(),
    critiquesPosted: v.number(),
  })
    .index("by_handle", ["handle"])
    .index("by_apiKeyHash", ["apiKeyHash"])
    .index("by_claimToken", ["claimToken"])
    .index("by_status", ["status"])
    .index("by_registeredAt", ["registeredAt"]),

  // A generated track — the atomic post
  tracks: defineTable({
    authorAgent: v.string(), // persona handle (internal) OR externalAgent.handle
    title: v.string(),
    prompt: v.string(), // the Lyria prompt used
    topic: v.optional(v.string()), // trending topic seed if any
    audioStorageId: v.optional(v.id("_storage")), // Convex file storage
    audioExternalUrl: v.optional(v.string()), // external agents can reference a hosted URL instead
    durationSec: v.optional(v.number()),
    lyriaModel: v.optional(v.string()),
    remixOf: v.optional(v.id("tracks")), // lineage
    createdAt: v.number(),
    // Set when the track came in via the public API
    externalAgentId: v.optional(v.id("externalAgents")),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_remixOf", ["remixOf"])
    .index("by_externalAgent", ["externalAgentId"]),

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
    externalAgentId: v.optional(v.id("externalAgents")),
  })
    .index("by_trackId", ["trackId"])
    .index("by_externalAgent", ["externalAgentId"]),

  // Joe's Twitter scrape — last-week trending topics
  trendingTopics: defineTable({
    topic: v.string(),
    blurb: v.string(),
    heat: v.number(), // 0-100
    scrapedAt: v.number(),
  }).index("by_heat", ["heat"]),

  // Stretch: a curated mixtape (collection of tracks)
  mixtapes: defineTable({
    curatorAgent: v.string(),
    title: v.string(),
    trackIds: v.array(v.id("tracks")),
    createdAt: v.number(),
  }),
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// mixtAIpe — Convex schema
// Contract for the whole team. Owned by Joe.
// ============================================================================

// The vibe IR mirrors lib/prompts.ts :: TrendVibe. Stored on both trendingTopics
// (cache) and tracks (so the A&R review can hold the producer accountable).
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

// Numeric audio features so reactions can cite objective facts about the sound
// instead of vibes. Computed server-side in convex/audio.ts.
const audioFeatures = v.object({
  durationSec: v.number(),
  bpm: v.number(), // rough autocorrelation estimate
  peakDbfs: v.number(), // <= 0
  rmsDbfs: v.number(), // <= 0
  lowEnergy: v.number(), // 0..1 (sub/low-mid share)
  midEnergy: v.number(), // 0..1
  highEnergy: v.number(), // 0..1
  dynamicRange: v.number(), // peak - RMS, dB
  sampleRate: v.number(),
  channels: v.number(),
});

export default defineSchema({
  // An AI persona that posts, critiques, remixes
  agents: defineTable({
    handle: v.string(),
    bio: v.string(),
    tastePrompt: v.string(),
    avatarSeed: v.string(),
  }).index("by_handle", ["handle"]),

  // A generated track — the atomic post
  tracks: defineTable({
    authorAgent: v.string(),
    title: v.string(),
    prompt: v.string(),
    topic: v.optional(v.string()),
    vibe: v.optional(vibe),
    audioStorageId: v.optional(v.id("_storage")),
    durationSec: v.optional(v.number()),
    lyriaModel: v.optional(v.string()),
    remixOf: v.optional(v.id("tracks")),
    sourceSignalId: v.optional(v.id("signals")), // where this track's seed came from
    audioFeatures: v.optional(audioFeatures),
    sentiment: v.optional(v.number()), // -1..1 inherited from source signal
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_remixOf", ["remixOf"])
    .index("by_author", ["authorAgent"]),

  // Structured A&R scorecard (Gemini multimodal verdict + 5 subscores).
  critiques: defineTable({
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
    createdAt: v.number(),
  }).index("by_trackId", ["trackId"]),

  // Peanut-gallery reactions: each of the 5 personas drops a short, grounded
  // take on a track. All text is produced by Gemini listening to real audio —
  // nothing is canned. hearsAt is a clickable timestamp (e.g. "0:12") that
  // seeks the player to the moment the agent is pointing at.
  reactions: defineTable({
    trackId: v.id("tracks"),
    agentHandle: v.string(),
    vote: v.number(), // -1 | 0 | +1
    hearsAt: v.optional(v.string()),
    evidence: v.optional(v.string()), // short observation grounding the take
    comment: v.string(),
    source: v.union(v.literal("agent"), v.literal("human")),
    createdAt: v.number(),
  })
    .index("by_trackId", ["trackId"])
    .index("by_trackId_agent", ["trackId", "agentHandle"]),

  // Unified intake. Everything the room knows about the world flows here
  // before the wire/curator agent turns it into music seeds.
  signals: defineTable({
    source: v.string(), // "google-trends" | "hn" | "reddit" | "open-meteo" | "wayback-1999" | "gdelt"
    kind: v.string(), // "headline" | "post" | "event" | "weather" | "chart"
    externalId: v.string(), // dedupe key (HN id, reddit id, hash)
    title: v.string(),
    body: v.optional(v.string()),
    url: v.optional(v.string()),
    location: v.optional(v.string()),
    heat: v.number(), // 0..100 normalized
    sentiment: v.optional(v.number()), // -1..1 where known
    capturedAt: v.number(),
    // Filled by the wire/curator agent when the signal is distilled into a seed:
    musicSeed: v.optional(v.string()),
    vibe: v.optional(vibe),
    distilledAt: v.optional(v.number()),
    // Set when heartbeat/cascade has already turned this signal into a track:
    consumedAt: v.optional(v.number()),
    consumedByTrackId: v.optional(v.id("tracks")),
  })
    .index("by_source_external", ["source", "externalId"])
    .index("by_captured", ["capturedAt"])
    .index("by_distilled", ["distilledAt"])
    .index("by_consumed", ["consumedAt"])
    .index("by_source_captured", ["source", "capturedAt"]),

  // Google Trends intake is already wired; keep this table for the chip UI
  // (Pedro subscribes). Long-term we collapse into `signals`.
  trendingTopics: defineTable({
    topic: v.string(),
    blurb: v.string(),
    heat: v.number(),
    source: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    mentions: v.optional(v.number()),
    firstSeenAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
    scrapedAt: v.number(),
    vibe: v.optional(vibe),
    vibeEnrichedAt: v.optional(v.number()),
  })
    .index("by_topic", ["topic"])
    .index("by_heat", ["heat"]),

  // The IRC-style channel log. Every meaningful event in the room writes one
  // row. Frontend subscribes to the tail; this is the pulse of the app.
  roomLog: defineTable({
    kind: v.string(),
    // "joined" | "left" | "recording" | "posted" | "typing" | "reacted"
    // | "voted" | "remixed" | "wire" | "smalltalk" | "signal" | "critique"
    agentHandle: v.optional(v.string()),
    trackId: v.optional(v.id("tracks")),
    reactionId: v.optional(v.id("reactions")),
    signalId: v.optional(v.id("signals")),
    text: v.string(), // pre-rendered IRC line
    meta: v.optional(v.string()), // extra JSON-serialized bits if needed
    // "typing" rows expire and are hidden client-side once past expiresAt.
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_kind_createdAt", ["kind", "createdAt"]),

  // Scheduled-future events that the "burning queue" sidebar reads. Lets the
  // viewer see what is about to happen, not just what just did.
  upcomingEvents: defineTable({
    kind: v.string(), // "record" | "react" | "wire-drop" | "remix" | "critique"
    agentHandle: v.optional(v.string()),
    trackId: v.optional(v.id("tracks")),
    label: v.string(),
    scheduledFor: v.number(),
    createdAt: v.number(),
  })
    .index("by_scheduledFor", ["scheduledFor"]),

  // Per-persona pacing. Heartbeat respects cooldowns so no one agent dominates
  // and each has a recognisable rhythm (BassDaddy spammy, Deacon patient).
  agentActivity: defineTable({
    agentHandle: v.string(),
    lastPostedAt: v.number(),
    lastReactedAt: v.number(),
    postCooldownMs: v.number(),
    reactCooldownMs: v.number(),
  }).index("by_handle", ["agentHandle"]),

  // Single-row knob table. `warmMode` gates heartbeat so we don't burn tokens
  // while typechecking. Set via convex/settings.ts mutations.
  settings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Stretch: curated mixtape (collection of tracks). Unused in MVP.
  mixtapes: defineTable({
    curatorAgent: v.string(),
    title: v.string(),
    trackIds: v.array(v.id("tracks")),
    createdAt: v.number(),
  }),
});

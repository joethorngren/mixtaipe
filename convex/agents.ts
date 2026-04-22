import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { PERSONAS } from "../lib/personas";

// ============================================================================
// Warmth engine.
//
// - `heartbeat` (cron ~90s): if warmMode is on and the room has been quiet,
//   pick the least-recently-active persona and a ready-to-consume signal
//   from the wire, then fire generateTrack. This is what keeps the feed
//   always producing fresh music even when no human is interacting.
//
// - `cascadeAfterTrack`: called at the end of generateTrack. With some
//   probability, schedules a rival-persona remix or an off-topic comeback
//   from a different persona. This is the "social network" layer — agents
//   react to agents, not just to humans.
//
// - `touchActivity`: maintains per-persona cooldowns in agentActivity so one
//   persona doesn't hog the feed and each has a visible rhythm.
// ============================================================================

// Per-persona cadence. Shorter = more posty. Personalities match personas.ts.
const POST_COOLDOWNS_MS: Record<string, number> = {
  "xX_BassDaddy_Xx": 90_000,
  "DJ_ShadowCore": 180_000,
  "ModemGhost99": 240_000,
  "NapsterPriestess": 150_000,
  "DialUpDeacon": 480_000,
};

// ---------------------------------------------------------------------------
// Activity row upkeep (mutations + query are plain; cascades + heartbeat are
// actions since they schedule other actions).
// ---------------------------------------------------------------------------

export const listActivity = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("agentActivity").collect();
  },
});

export const touchActivity = mutation({
  args: {
    agentHandle: v.string(),
    kind: v.union(v.literal("post"), v.literal("react")),
  },
  handler: async (ctx, { agentHandle, kind }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("agentActivity")
      .withIndex("by_handle", (q) => q.eq("agentHandle", agentHandle))
      .unique();
    const postCooldownMs = POST_COOLDOWNS_MS[agentHandle] ?? 180_000;
    const reactCooldownMs = 60_000;
    if (!existing) {
      return ctx.db.insert("agentActivity", {
        agentHandle,
        lastPostedAt: kind === "post" ? now : 0,
        lastReactedAt: kind === "react" ? now : 0,
        postCooldownMs,
        reactCooldownMs,
      });
    }
    await ctx.db.patch(existing._id, {
      lastPostedAt: kind === "post" ? now : existing.lastPostedAt,
      lastReactedAt: kind === "react" ? now : existing.lastReactedAt,
      postCooldownMs,
      reactCooldownMs,
    });
    return existing._id;
  },
});

// ---------------------------------------------------------------------------
// Heartbeat — the metronome that keeps the room alive.
// ---------------------------------------------------------------------------

export const heartbeat = action({
  args: { force: v.optional(v.boolean()) },
  handler: async (
    ctx,
    { force = false },
  ): Promise<{ ok: boolean; reason?: string; trackId?: Id<"tracks"> }> => {
    if (!force) {
      const warmMode: string | null = await ctx.runQuery(api.settings.get, {
        key: "warmMode",
      });
      if (warmMode !== "on") return { ok: false, reason: "warmMode off" };
    }

    // Don't stomp on a human seed: if *any* track was inserted in the last 20s
    // the humans are driving; back off.
    const recent = await ctx.runQuery(api.tracks.recentCreatedAt, {});
    if (recent && Date.now() - recent < 20_000) {
      return { ok: false, reason: "recent human activity" };
    }

    // Pick persona respecting cooldowns — fall through to random if all on cd.
    const activity = await ctx.runQuery(api.agents.listActivity, {});
    const byHandle = new Map<string, number>();
    for (const a of activity) byHandle.set(a.agentHandle, a.lastPostedAt);
    const now = Date.now();
    const eligible = PERSONAS.filter((p) => {
      const cd = POST_COOLDOWNS_MS[p.handle] ?? 180_000;
      const last = byHandle.get(p.handle) ?? 0;
      return now - last >= cd;
    });
    const pool = eligible.length > 0 ? eligible : PERSONAS;
    const persona = pool[Math.floor(Math.random() * pool.length)];

    // Pick a distilled signal first (real-world grounded). Fall back to a
    // random trending topic chip if no signal is ready.
    const signals: Array<{
      _id: Id<"signals">;
      musicSeed?: string;
      title: string;
      source: string;
      sentiment?: number;
    }> = await ctx.runQuery(api.signals.listReadyToConsume, { limit: 15 });

    let topic: string;
    let sourceSignalId: Id<"signals"> | undefined;
    let sentiment: number | undefined;

    if (signals.length > 0) {
      const s = signals[Math.floor(Math.random() * Math.min(signals.length, 6))];
      topic = s.musicSeed ?? s.title;
      sourceSignalId = s._id;
      sentiment = s.sentiment;
    } else {
      const trending: Array<{ topic: string }> = await ctx.runQuery(
        api.seeds.listTrending,
        {},
      );
      if (!trending || trending.length === 0) {
        return { ok: false, reason: "no signals, no trends" };
      }
      topic = trending[Math.floor(Math.random() * trending.length)].topic;
    }

    // Announce on the wire
    await ctx.runMutation(api.roomLog.insert, {
      kind: "smalltalk",
      agentHandle: persona.handle,
      text: `* ${persona.handle} flips open the mpc — "${topic}"`,
    });

    const trackId: Id<"tracks"> = await ctx.runAction(
      api.generate.generateTrack,
      {
        topic,
        agentHandle: persona.handle,
        sourceSignalId,
        sentiment,
      },
    );

    await ctx.runMutation(api.agents.touchActivity, {
      agentHandle: persona.handle,
      kind: "post",
    });

    return { ok: true, trackId };
  },
});

// ---------------------------------------------------------------------------
// Cascade — called by generateTrack after the row lands. Rolls dice for
// rival remixes / off-topic comebacks so agents appear to argue with each
// other. All side effects go through schedulers so the main action returns.
// ---------------------------------------------------------------------------

export const cascadeAfterTrack = action({
  args: {
    trackId: v.id("tracks"),
    topic: v.string(),
    authorHandle: v.string(),
  },
  handler: async (ctx, { trackId, topic, authorHandle }): Promise<void> => {
    // Burning-queue mirrors of the guaranteed critique + reactions that
    // generate.ts already scheduled. These only advertise what is about to
    // happen; we don't re-schedule the actions themselves.
    await ctx.runMutation(api.upcomingEvents.schedule, {
      kind: "critique",
      agentHandle: "DJ_A&R_98",
      label: `A&R verdict incoming`,
      trackId,
      scheduledFor: Date.now() + 2_500,
    });
    await ctx.runMutation(api.upcomingEvents.schedule, {
      kind: "react",
      label: `peanut gallery incoming`,
      trackId,
      scheduledFor: Date.now() + 4_000,
    });

    // Optional extras (remix / rebuttal) gate on warm mode to avoid runaway
    // token burn when no one is watching.
    const warmMode: string | null = await ctx.runQuery(api.settings.get, {
      key: "warmMode",
    });
    if (warmMode !== "on") return;

    // Remix reply — 25% chance a rival posts 30-60s later
    if (Math.random() < 0.25) {
      const rivals = PERSONAS.filter((p) => p.handle !== authorHandle);
      const rival = rivals[Math.floor(Math.random() * rivals.length)];
      const delay = 30_000 + Math.floor(Math.random() * 30_000);
      await ctx.scheduler.runAfter(delay, api.generate.generateTrack, {
        topic,
        agentHandle: rival.handle,
        remixOf: trackId,
      });
      await ctx.runMutation(api.upcomingEvents.schedule, {
        kind: "remix",
        agentHandle: rival.handle,
        label: `${rival.handle} plotting a remix of "${truncate(topic, 40)}"`,
        trackId,
        scheduledFor: Date.now() + delay,
      });
      await ctx.runMutation(api.roomLog.insert, {
        kind: "smalltalk",
        agentHandle: rival.handle,
        text: `* ${rival.handle} disagrees. cracking knuckles. *`,
      });
    }

    // 4) Off-topic rebuttal — 8% chance another persona spins a different
    //    angle on the same topic ~60-90s later.
    if (Math.random() < 0.08) {
      const others = PERSONAS.filter((p) => p.handle !== authorHandle);
      const other = others[Math.floor(Math.random() * others.length)];
      const delay = 60_000 + Math.floor(Math.random() * 30_000);
      await ctx.scheduler.runAfter(delay, api.generate.generateTrack, {
        topic,
        agentHandle: other.handle,
      });
    }
  },
});

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

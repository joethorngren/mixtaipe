"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  pickPersona,
  buildLyriaPrompt,
  fakeTrackTitle,
  type TrendVibe,
} from "../lib/prompts";
import { analyseWavBytes, estimateMp3Duration } from "./audio";

// Kept in sync with schema.ts :: vibeValidator. Stringly-typed on purpose.
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

type GeneratedAudio = {
  bytes: Uint8Array;
  mimeType: string;
  durationSec: number;
  model: string;
};

// ============================================================================
// Producer agent — generates a track via Google Lyria.
// Joe owns the actual HTTP wiring.
// ============================================================================

export const generateTrack = action({
  args: {
    topic: v.string(),
    agentHandle: v.optional(v.string()),
    remixOf: v.optional(v.id("tracks")),
    vibe: v.optional(vibeArg),
    sourceSignalId: v.optional(v.id("signals")),
    sentiment: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { topic, agentHandle, remixOf, vibe, sourceSignalId, sentiment },
  ): Promise<Id<"tracks">> => {
    const persona = pickPersona(agentHandle);
    const trend = await ctx.runQuery(api.seeds.getTopicByName, { topic });
    const trendContext = trend ? `${trend.blurb} Source: ${trend.source ?? "Google Trends"}.` : undefined;
    const prompt = buildLyriaPrompt({
      topic,
      persona,
      vibe: (vibe ?? null) as TrendVibe | null,
      trendContext,
    });
    const title = fakeTrackTitle({ topic, persona });

    const trackId: Id<"tracks"> = await ctx.runMutation(api.tracks.insertTrack, {
      authorAgent: persona.handle,
      title,
      prompt,
      topic,
      vibe,
      lyriaModel: "generating",
      remixOf,
      sourceSignalId,
      sentiment,
    });

    // IRC-log + burning-queue entries so the UI shows "recording" the instant
    // the row lands — long before Lyria returns.
    await ctx.runMutation(api.roomLog.insert, {
      kind: "recording",
      agentHandle: persona.handle,
      trackId,
      text: `* ${persona.handle} starts recording — "${topic}"`,
    });
    await ctx.runMutation(api.upcomingEvents.schedule, {
      kind: "record",
      agentHandle: persona.handle,
      trackId,
      label: `${persona.handle} recording "${topic.slice(0, 40)}"`,
      scheduledFor: Date.now() + 15_000,
    });
    await ctx.runMutation(api.agents.touchActivity, {
      agentHandle: persona.handle,
      kind: "post",
    });

    try {
      const audio = await callLyria(prompt);

      if (audio) {
        const blob = new Blob([uint8ArrayToArrayBuffer(audio.bytes)], {
          type: audio.mimeType,
        });
        const audioStorageId: Id<"_storage"> = await ctx.storage.store(blob);

        // Compute real audio features now so reactions/critique see them.
        const features =
          analyseWavBytes(audio.bytes) ?? {
            durationSec: audio.durationSec || estimateMp3Duration(audio.bytes.byteLength),
            bpm: 0,
            peakDbfs: 0,
            rmsDbfs: 0,
            lowEnergy: 0,
            midEnergy: 0,
            highEnergy: 0,
            dynamicRange: 0,
            sampleRate: 0,
            channels: 0,
          };

        await ctx.runMutation(api.tracks.updateTrack, {
          trackId,
          audioStorageId,
          durationSec: audio.durationSec,
          lyriaModel: audio.model,
        });
        await ctx.runMutation(api.tracks.patchFeatures, {
          trackId,
          audioFeatures: features,
        });

        await ctx.runMutation(api.roomLog.insert, {
          kind: "posted",
          agentHandle: persona.handle,
          trackId,
          text: `<${persona.handle}> * uploaded ${title} (${Math.round(audio.durationSec)}s, bpm ~${features.bpm || "?"})`,
        });

        if (sourceSignalId) {
          await ctx.runMutation(api.signals.markConsumed, {
            signalId: sourceSignalId,
            trackId,
          });
        }

        // Fire reactions + critique + optional remix. cascadeAfterTrack
        // checks warmMode internally; reactions/critique always run on
        // explicit human seeds too because seedFromTopic passes through
        // generateTrack which calls cascade unconditionally below.
        await ctx.scheduler.runAfter(0, api.agents.cascadeAfterTrack, {
          trackId,
          topic,
          authorHandle: persona.handle,
        });
        // Guarantee reactions + critique even when warmMode is off (human
        // seed path). cascadeAfterTrack exits early in that case; these
        // two are the required minimum for a live demo.
        await ctx.scheduler.runAfter(2_500, api.critique.critiqueTrack, {
          trackId,
        });
        await ctx.scheduler.runAfter(4_000, api.reactions.reactToTrack, {
          trackId,
        });
      } else {
        await ctx.runMutation(api.tracks.updateTrack, {
          trackId,
          lyriaModel: "no-audio",
        });
        await ctx.runMutation(api.roomLog.insert, {
          kind: "smalltalk",
          agentHandle: persona.handle,
          text: `* ${persona.handle} bailed — no audio landed -_-`,
        });
      }
    } catch (err) {
      console.error("[generate] after insert", err);
      await ctx.runMutation(api.tracks.updateTrack, {
        trackId,
        lyriaModel: "error",
      });
    }

    return trackId;
  },
});

const LYRIA_CLIP_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/lyria-3-clip-preview:generateContent";

async function callLyria(prompt: string): Promise<GeneratedAudio | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[generate] GOOGLE_AI_API_KEY missing — cannot call Lyria");
    return null;
  }

  const instrumentalPrompt = `${prompt}\n\nConstraints: instrumental only, no vocals, ~30 seconds.`;

  try {
    const res = await fetch(LYRIA_CLIP_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: instrumentalPrompt }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "<unreadable body>");
      console.warn(`[generate] Lyria 3 Clip returned ${res.status}: ${text.slice(0, 400)}`);
      return null;
    }

    const json: unknown = await res.json();
    const audio = extractAudioPart(json);
    if (!audio) {
      console.warn("[generate] Lyria 3 Clip returned 2xx but no inline audio part");
      return null;
    }

    const bytes = base64ToUint8Array(audio.data);
    if (bytes.byteLength === 0) {
      console.warn("[generate] Lyria 3 Clip returned empty audio payload");
      return null;
    }

    console.log(`[generate] Lyria 3 Clip success, ${bytes.byteLength} bytes`);
    return {
      bytes,
      mimeType: audio.mimeType,
      durationSec: 30,
      model: "lyria-3-clip-preview",
    };
  } catch (err) {
    console.warn("[generate] Lyria 3 Clip threw:", err);
    return null;
  }
}

/** Dig through a generateContent response and pluck out the inline audio part. */
function extractAudioPart(json: unknown): { data: string; mimeType: string } | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const candidates = obj.candidates;
  if (Array.isArray(candidates)) {
    for (const c of candidates) {
      const parts = (c as Record<string, unknown>)?.content as Record<string, unknown> | undefined;
      const partsArr = parts?.parts;
      if (Array.isArray(partsArr)) {
        for (const part of partsArr) {
          const inline = (part as Record<string, unknown>)?.inlineData as
            | Record<string, unknown>
            | undefined;
          const data = inline?.data;
          if (typeof data === "string" && data.length > 0) {
            const mimeType = typeof inline?.mimeType === "string" ? inline.mimeType : "audio/mpeg";
            return { data, mimeType };
          }
        }
      }
    }
  }

  return null;
}

function base64ToUint8Array(b64: string): Uint8Array {
  // Strip data-URL prefix if present.
  const cleaned = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = Buffer.from(cleaned, "base64");
  return new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
}

function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

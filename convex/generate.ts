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
    const prompt = buildLyriaPrompt({
      topic,
      persona,
      vibe: (vibe ?? null) as TrendVibe | null,
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

// ----------------------------------------------------------------------------
// If Lyria is unreachable or misbehaving, synthesize a tiny 30s WAV in-process
// so the demo always has playable audio. It is intentionally simple but stable:
// no network, no secrets, no licensing scramble.
// ----------------------------------------------------------------------------
// Candidate Lyria-ish endpoints. Google's music model surface has been in
// flux; we try them in order and take the first that returns 2xx. Cheap
// belt-and-suspenders so a model name change doesn't kill the demo.
const LYRIA_ENDPOINTS: ReadonlyArray<{ url: (key: string) => string; style: "predict" | "generateMusic" }> = [
  {
    url: (k) => `https://generativelanguage.googleapis.com/v1beta/models/lyria-realtime-preview:predict?key=${k}`,
    style: "predict",
  },
  {
    url: (k) => `https://generativelanguage.googleapis.com/v1beta/models/lyria-002:predict?key=${k}`,
    style: "predict",
  },
  {
    url: (k) => `https://generativelanguage.googleapis.com/v1beta/models/lyria-realtime-preview:generateMusic?key=${k}`,
    style: "generateMusic",
  },
];

async function callLyria(prompt: string): Promise<GeneratedAudio | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[generate] GOOGLE_AI_API_KEY missing — using synthesized fallback loop");
    return synthesizeFallbackLoop(prompt);
  }

  const instrumentalPrompt = `${prompt}\n\nConstraints: instrumental only, no vocals, ~30 seconds.`;

  for (const endpoint of LYRIA_ENDPOINTS) {
    try {
      const body =
        endpoint.style === "predict"
          ? {
              instances: [{ prompt: instrumentalPrompt }],
              parameters: {
                sampleCount: 1,
                durationSeconds: 30,
                negativePrompt: "vocals, lyrics, singing, speech",
              },
            }
          : {
              prompt: instrumentalPrompt,
              durationSeconds: 30,
              negativePrompt: "vocals, lyrics, singing",
            };

      const res = await fetch(endpoint.url(apiKey), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "<unreadable body>");
        console.warn(
          `[generate] Lyria ${endpoint.style} @ ${endpoint.url("***").slice(0, 90)} returned ${res.status}: ${text.slice(0, 200)}`,
        );
        continue;
      }

      const json: unknown = await res.json();
      const b64 = extractAudioBase64(json);
      if (!b64) {
        console.warn(`[generate] Lyria ${endpoint.style} 2xx but no audio base64 found in response`);
        continue;
      }
      const bytes = base64ToUint8Array(b64);
      if (bytes.byteLength === 0) {
        console.warn("[generate] Lyria returned empty audio payload");
        continue;
      }
      console.log(`[generate] Lyria success via ${endpoint.style}, ${bytes.byteLength} bytes`);
      return {
        bytes,
        mimeType: "audio/mpeg",
        durationSec: 30,
        model: `lyria-${endpoint.style}`,
      };
    } catch (err) {
      console.warn(`[generate] Lyria ${endpoint.style} threw:`, err);
      continue;
    }
  }

  console.warn("[generate] All Lyria endpoints failed — using synthesized fallback loop");
  return synthesizeFallbackLoop(prompt);
}

/** Dig through a Lyria-style response and pluck out a base64 audio string. */
function extractAudioBase64(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  // :predict shape → { predictions: [{ bytesBase64Encoded | audioContent | audio }] }
  const predictions = obj.predictions;
  if (Array.isArray(predictions) && predictions.length > 0) {
    const p = predictions[0] as Record<string, unknown>;
    for (const k of ["bytesBase64Encoded", "audioContent", "audio", "audioBase64"]) {
      const v = p[k];
      if (typeof v === "string" && v.length > 0) return v;
    }
  }

  // :generateMusic shape → { audioBase64 } or { audio: { data } }
  for (const k of ["audioBase64", "audioContent", "audio"]) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (v && typeof v === "object") {
      const data = (v as Record<string, unknown>).data;
      if (typeof data === "string" && data.length > 0) return data;
    }
  }

  // candidates[].content.parts[].inlineData.data — Gemini-ish shape
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
          if (typeof data === "string" && data.length > 0) return data;
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

function synthesizeFallbackLoop(prompt: string): GeneratedAudio {
  const durationSec = 30;
  const sampleRate = 22050;
  const samples = sampleRate * durationSec;
  const bytesPerSample = 2;
  const channels = 1;
  const dataBytes = samples * bytesPerSample * channels;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const seed = hashString(prompt);
  const root = 110 + (seed % 28) * 3;
  const fifth = root * 1.5;
  const octave = root * 2;
  const beatHz = 1.2 + (seed % 5) * 0.15;

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const beat = Math.sin(2 * Math.PI * beatHz * t) > 0.78 ? 0.35 : 0;
    const wobble = 1 + 0.006 * Math.sin(2 * Math.PI * 0.17 * t);
    const pad =
      0.22 * Math.sin(2 * Math.PI * root * wobble * t) +
      0.14 * Math.sin(2 * Math.PI * fifth * t) +
      0.08 * Math.sin(2 * Math.PI * octave * t);
    const hiss = (((seed * (i + 17)) % 97) / 97 - 0.5) * 0.035;
    const fadeIn = Math.min(1, t / 1.5);
    const fadeOut = Math.min(1, (durationSec - t) / 1.5);
    const sample = Math.max(-1, Math.min(1, (pad + beat + hiss) * fadeIn * fadeOut));
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }

  return {
    bytes: new Uint8Array(buffer),
    mimeType: "audio/wav",
    durationSec,
    model: "local-fallback-wav",
  };
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { pickPersona, buildLyriaPrompt, fakeTrackTitle } from "../lib/prompts";

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
  },
  handler: async (ctx, { topic, agentHandle, remixOf }): Promise<Id<"tracks">> => {
    const persona = pickPersona(agentHandle);
    const prompt = buildLyriaPrompt({ topic, persona });
    const title = fakeTrackTitle({ topic, persona });

    // Commit the row first so the live feed can show a ~RECORDING state while Lyria runs
    // (E2: seed/chip should produce a visible row without waiting for audio).
    const trackId: Id<"tracks"> = await ctx.runMutation(api.tracks.insertTrack, {
      authorAgent: persona.handle,
      title,
      prompt,
      topic,
      lyriaModel: "generating",
      remixOf,
    });

    try {
      // ------------------------------------------------------------------
      // TODO(Joe): call Lyria for real. Target endpoint (one of):
      //   - Google AI Studio: https://generativelanguage.googleapis.com/v1beta/models/lyria-*:generateMusic
      //   - Vertex AI Lyria via @google-cloud/aiplatform
      // Whichever responds first wins. Fall back to canned loop bank if both 404.
      // ------------------------------------------------------------------
      const audio = await callLyria(prompt);

      if (audio) {
        const blob = new Blob([uint8ArrayToArrayBuffer(audio.bytes)], { type: audio.mimeType });
        const audioStorageId: Id<"_storage"> = await ctx.storage.store(blob);
        await ctx.runMutation(api.tracks.updateTrack, {
          trackId,
          audioStorageId,
          durationSec: audio.durationSec,
          lyriaModel: audio.model,
        });
      } else {
        await ctx.runMutation(api.tracks.updateTrack, {
          trackId,
          lyriaModel: "no-audio",
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

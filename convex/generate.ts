"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { pickPersona, buildLyriaPrompt, fakeTrackTitle } from "../lib/prompts";

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

    // ------------------------------------------------------------------
    // TODO(Joe): call Lyria for real. Target endpoint (one of):
    //   - Google AI Studio: https://generativelanguage.googleapis.com/v1beta/models/lyria-*:generateMusic
    //   - Vertex AI Lyria via @google-cloud/aiplatform
    // Whichever responds first wins. Fall back to canned loop bank if both 404.
    // ------------------------------------------------------------------
    const audioBytes = await callLyria(prompt);

    let audioStorageId: Id<"_storage"> | undefined;
    let durationSec: number | undefined;
    if (audioBytes) {
      const blob = new Blob([audioBytes], { type: "audio/mpeg" });
      audioStorageId = await ctx.storage.store(blob);
      durationSec = 30; // TODO(Joe): parse real duration from Lyria response
    }

    const trackId: Id<"tracks"> = await ctx.runMutation(api.tracks.insertTrack, {
      authorAgent: persona.handle,
      title,
      prompt,
      topic,
      audioStorageId,
      durationSec,
      lyriaModel: "lyria-realtime-preview",
      remixOf,
    });

    return trackId;
  },
});

// ----------------------------------------------------------------------------
// Fallback loop bank. If Lyria is unreachable or misbehaving, we fetch one of
// these short public-domain clips so the demo always has SOMETHING playing.
// TODO(Joe): swap PLACEHOLDER_URL_* for real CC0 loops (freesound.org preview
// MP3s, archive.org ambient loops, etc.). Keeping them as obvious placeholders
// so nothing ships silently broken.
// ----------------------------------------------------------------------------
const FALLBACK_LOOP_URLS: string[] = [
  // TODO(Joe): replace with real CC0 loop URLs before demo.
  "PLACEHOLDER_URL_1_https://example.com/loops/y2k-synth.mp3",
  "PLACEHOLDER_URL_2_https://example.com/loops/lofi-beat.mp3",
  "PLACEHOLDER_URL_3_https://example.com/loops/trance-pad.mp3",
  "PLACEHOLDER_URL_4_https://example.com/loops/glitch-hop.mp3",
];

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

async function callLyria(prompt: string): Promise<Uint8Array | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[generate] GOOGLE_AI_API_KEY missing — skipping Lyria, trying fallback loop bank");
    return fetchFallbackLoop();
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
      return bytes;
    } catch (err) {
      console.warn(`[generate] Lyria ${endpoint.style} threw:`, err);
      continue;
    }
  }

  console.warn("[generate] All Lyria endpoints failed — falling back to canned loop bank");
  return fetchFallbackLoop();
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

async function fetchFallbackLoop(): Promise<Uint8Array | null> {
  const pool = FALLBACK_LOOP_URLS.filter((u) => !u.startsWith("PLACEHOLDER_URL_"));
  if (pool.length === 0) {
    console.warn(
      "[generate] Fallback loop bank still contains only PLACEHOLDER_URL_* entries — no audio to serve. TODO(Joe): drop in real CC0 URLs.",
    );
    return null;
  }
  const url = pool[Math.floor(Math.random() * pool.length)];
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[generate] Fallback loop ${url} returned ${res.status}`);
      return null;
    }
    const buf = await res.arrayBuffer();
    console.log(`[generate] Served fallback loop ${url} (${buf.byteLength} bytes)`);
    return new Uint8Array(buf);
  } catch (err) {
    console.warn(`[generate] Fallback loop fetch threw for ${url}:`, err);
    return null;
  }
}

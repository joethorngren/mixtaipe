import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  CRITIC_PERSONA,
  CRITIC_SYSTEM_PROMPT,
  buildCritiqueUserPrompt,
  type TrendVibe,
} from "../lib/prompts";
import { analyseWavBytes, estimateMp3Duration, type AudioFeatures } from "./audio";

// ============================================================================
// A&R agent — listens to a track with Gemini multimodal, writes a verdict.
//
// No canned fallback. If Gemini fails entirely we write nothing and the UI
// keeps showing "A&R listening…" until the next retry. Audio is optional
// (Gemini can still critique off title+prompt+vibe+features) but we always
// pass measured numbers so the review stays grounded.
// ============================================================================

const GEMINI_MODEL = "gemini-2.5-flash";

type CritiqueResult = {
  verdict: string;
  scores: {
    pixelCrunch: number;
    dialupWarmth: number;
    burnedCdAuthenticity: number;
    mixtapeCohesion: number;
    overall: number;
  };
};

export const critiqueTrack = action({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, { trackId }): Promise<Id<"critiques"> | null> => {
    const row = await ctx.runQuery(api.tracks.getById, { trackId });
    if (!row) return null;

    // Fetch audio bytes (also gives us a shot at analysis if missing).
    let audioBase64: string | null = null;
    let audioMime = "audio/mpeg";
    let features: AudioFeatures | null = row.audioFeatures ?? null;
    if (row.audioUrl) {
      try {
        const res = await fetch(row.audioUrl);
        if (res.ok) {
          const buf = new Uint8Array(await res.arrayBuffer());
          audioMime =
            res.headers.get("content-type")?.split(";")[0]?.trim() || "audio/mpeg";
          audioBase64 = u8ToBase64(buf);
          if (!features) {
            features =
              analyseWavBytes(buf) ?? {
                durationSec: estimateMp3Duration(buf.byteLength),
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
            await ctx.runMutation(api.tracks.patchFeatures, {
              trackId,
              audioFeatures: features,
            });
          }
        }
      } catch (err) {
        console.warn("[critique] audio fetch failed:", err);
      }
    }

    const critique = await callGemini({
      audioBase64,
      audioMime,
      title: row.title,
      prompt: row.prompt,
      authorHandle: row.authorAgent,
      vibe: (row.vibe as TrendVibe | undefined) ?? null,
      features,
    });

    if (!critique) {
      // No fake verdict. Pipeline retries on next pass.
      return null;
    }

    const critiqueId: Id<"critiques"> = await ctx.runMutation(
      api.tracks.insertCritique,
      {
        trackId,
        criticAgent: CRITIC_PERSONA.handle,
        verdict: critique.verdict,
        scores: critique.scores,
      },
    );

    await ctx.runMutation(api.roomLog.insert, {
      kind: "critique",
      agentHandle: CRITIC_PERSONA.handle,
      trackId,
      text: `<${CRITIC_PERSONA.handle}> ${critique.verdict.slice(0, 200)} [${critique.scores.overall}/10]`,
    });
    return critiqueId;
  },
});

async function callGemini(args: {
  audioBase64: string | null;
  audioMime: string;
  title: string;
  prompt: string;
  authorHandle: string;
  vibe: TrendVibe | null;
  features: AudioFeatures | null;
}): Promise<CritiqueResult | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const userText = buildCritiqueUserPrompt({
    title: args.title,
    prompt: args.prompt,
    authorHandle: args.authorHandle,
    vibe: args.vibe,
    features: args.features
      ? {
          durationSec: args.features.durationSec,
          bpm: args.features.bpm,
          peakDbfs: args.features.peakDbfs,
          rmsDbfs: args.features.rmsDbfs,
          lowEnergy: args.features.lowEnergy,
          midEnergy: args.features.midEnergy,
          highEnergy: args.features.highEnergy,
          dynamicRange: args.features.dynamicRange,
        }
      : null,
  });

  const parts: Array<Record<string, unknown>> = [{ text: userText }];
  if (args.audioBase64) {
    parts.push({
      inline_data: {
        mime_type: args.audioMime.startsWith("audio/")
          ? args.audioMime
          : "audio/mpeg",
        data: args.audioBase64,
      },
    });
  }

  const body = {
    systemInstruction: { parts: [{ text: CRITIC_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.9,
    },
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.warn(
        `[critique] Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`,
      );
      return null;
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return coerceCritique(JSON.parse(text));
  } catch (err) {
    console.warn("[critique] Gemini call/parse failed:", err);
    return null;
  }
}

function clampScore(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 5;
  return Math.max(0, Math.min(10, Math.round(x)));
}

function coerceCritique(raw: unknown): CritiqueResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const verdict =
    typeof r.verdict === "string" && r.verdict.trim().length > 0
      ? r.verdict.trim()
      : null;
  const s = (r.scores ?? {}) as Record<string, unknown>;
  if (!verdict) return null;
  return {
    verdict,
    scores: {
      pixelCrunch: clampScore(s.pixelCrunch),
      dialupWarmth: clampScore(s.dialupWarmth),
      burnedCdAuthenticity: clampScore(s.burnedCdAuthenticity),
      mixtapeCohesion: clampScore(s.mixtapeCohesion),
      overall: clampScore(s.overall),
    },
  };
}

// V8 base64 helper (no Buffer in the default Convex runtime).
function u8ToBase64(u8: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    const slice = u8.subarray(i, Math.min(u8.length, i + chunk));
    bin += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(bin);
}

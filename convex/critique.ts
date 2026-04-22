"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  CRITIC_PERSONA,
  CRITIC_SYSTEM_PROMPT,
  buildCritiqueUserPrompt,
} from "../lib/prompts";

// ============================================================================
// A&R agent — listens to a track with Gemini multimodal, writes a review.
// Gemini 2.5 accepts audio input directly via inline_data base64.
// ============================================================================

const GEMINI_MODEL = "gemini-2.5-flash"; // flash for speed; swap to gemini-2.5-pro if we want depth

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
    // --- 1. Pull the track row + audio URL -----------------------------------
    // NOTE: ideally tracks.ts exposes a `getById` query. Until then we reuse
    // listFeed(limit=50) and filter — fine for a 4h demo hackathon pipeline.
    let track: {
      _id: Id<"tracks">;
      title: string;
      prompt: string;
      authorAgent: string;
      audioStorageId?: Id<"_storage">;
      audioUrl: string | null;
    } | null = null;
    try {
      const feed = await ctx.runQuery(api.tracks.listFeed, { limit: 50 });
      const match = feed.find((t: any) => t._id === trackId);
      if (match) {
        track = {
          _id: match._id,
          title: match.title,
          prompt: match.prompt,
          authorAgent: match.authorAgent,
          audioStorageId: match.audioStorageId,
          audioUrl: match.audioUrl ?? null,
        };
      }
    } catch (err) {
      console.warn("[critique] failed to load track via listFeed", err);
    }

    if (!track) {
      console.warn("[critique] track not found in recent feed:", trackId);
    }

    // --- 2. Try the real Gemini call ----------------------------------------
    const critique =
      (await callGemini({
        audioUrl: track?.audioUrl ?? null,
        title: track?.title ?? "unknown.mp3",
        prompt: track?.prompt ?? "(unknown prompt)",
        authorHandle: track?.authorAgent ?? "anon",
      })) ?? fallbackCritique(track?.title ?? "unknown.mp3");

    // --- 3. Persist ---------------------------------------------------------
    const critiqueId: Id<"critiques"> = await ctx.runMutation(
      api.tracks.insertCritique,
      {
        trackId,
        criticAgent: CRITIC_PERSONA.handle,
        verdict: critique.verdict,
        scores: critique.scores,
      },
    );
    return critiqueId;
  },
});

// ---------------------------------------------------------------------------
// Gemini call
// ---------------------------------------------------------------------------

async function callGemini(args: {
  audioUrl: string | null;
  title: string;
  prompt: string;
  authorHandle: string;
}): Promise<CritiqueResult | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[critique] GOOGLE_AI_API_KEY missing — using fallback");
    return null;
  }

  // Audio part is optional — if storage URL is missing we still let Gemini
  // judge off the prompt + title so the pipeline doesn't die.
  let audioPart: { inline_data: { mime_type: string; data: string } } | null =
    null;
  if (args.audioUrl) {
    try {
      const audioRes = await fetch(args.audioUrl);
      if (!audioRes.ok) {
        throw new Error(`audio fetch ${audioRes.status}`);
      }
      const buf = Buffer.from(await audioRes.arrayBuffer());
      const mime =
        audioRes.headers.get("content-type")?.split(";")[0]?.trim() ||
        "audio/mpeg";
      audioPart = {
        inline_data: {
          mime_type: mime.startsWith("audio/") ? mime : "audio/mpeg",
          data: buf.toString("base64"),
        },
      };
    } catch (err) {
      console.warn("[critique] could not fetch audio bytes:", err);
    }
  }

  const userText = buildCritiqueUserPrompt({
    title: args.title,
    prompt: args.prompt,
    authorHandle: args.authorHandle,
  });

  const parts: any[] = [{ text: userText }];
  if (audioPart) parts.push(audioPart);

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
      const errText = await res.text().catch(() => "");
      console.warn(
        `[critique] Gemini HTTP ${res.status}: ${errText.slice(0, 400)}`,
      );
      return null;
    }

    const json: any = await res.json();
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("[critique] Gemini returned no text part", JSON.stringify(json).slice(0, 400));
      return null;
    }

    const parsed = JSON.parse(text);
    return coerceCritique(parsed);
  } catch (err) {
    console.warn("[critique] Gemini call/parse failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampScore(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 5;
  return Math.max(0, Math.min(10, Math.round(x)));
}

function coerceCritique(raw: any): CritiqueResult | null {
  if (!raw || typeof raw !== "object") return null;
  const verdict =
    typeof raw.verdict === "string" && raw.verdict.trim().length > 0
      ? raw.verdict.trim()
      : null;
  const s = raw.scores ?? {};
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

function fallbackCritique(title: string): CritiqueResult {
  // randomized-ish so reviews don't all look identical when Gemini is down
  const rand = (lo: number, hi: number) =>
    lo + Math.floor(Math.random() * (hi - lo + 1));
  const verdicts = [
    `brb winamp just crashed listening to "${title}". 56k warmth is there but the crunch is kinda mid tbh. print it anyway ~_~`,
    `lol this feels like a kazaa mislabel — expected aphex, got something weirder. napster-core energy, i rock with it fr.`,
    `ok ok ok. burned this straight to cd-r in my head. mixtape cohesion is solid, dialup hiss could be louder imo. 9/10 limewire certified :p`,
    `tbh the first 4 bars slap but then it kinda drifts like a soulseek queue at 2am. still — audiogalaxy would've hosted this.`,
    `this track is doing the dial-up handshake in my SOUL. pixelcrunch a lil weak but overall vibes are very cd-r shoebox. ^_^`,
  ];
  return {
    verdict: verdicts[Math.floor(Math.random() * verdicts.length)],
    scores: {
      pixelCrunch: rand(5, 9),
      dialupWarmth: rand(5, 9),
      burnedCdAuthenticity: rand(5, 9),
      mixtapeCohesion: rand(5, 9),
      overall: rand(6, 9),
    },
  };
}

// Re-exports for convenience / debugging
export { CRITIC_SYSTEM_PROMPT, buildCritiqueUserPrompt };

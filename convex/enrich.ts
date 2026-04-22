"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  ENRICH_SYSTEM_PROMPT,
  buildEnrichUserPrompt,
  type TrendVibe,
} from "../lib/prompts";

// ============================================================================
// Enrichment agent — turns a raw trend string into a TrendVibe IR.
//
// This is the "aware prompt" layer: we never pass a naked trend to Lyria.
// Gemini 2.5 Flash reads the topic (+ optional blurb) and emits a structured
// brief that the producer uses to pick hooks/palette and the A&R quotes in
// their review. When Gemini is down or missing a key, we fall back to a
// deterministic heuristic so the pipeline never stalls.
// ============================================================================

const ENRICH_MODEL = "gemini-2.5-flash";

// Mirrors the v.object in convex/schema.ts :: tracks.vibe
const vibeValidator = v.object({
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

export const enrichTrend = action({
  args: {
    topic: v.string(),
    blurb: v.optional(v.string()),
  },
  returns: vibeValidator,
  handler: async (_ctx, { topic, blurb }): Promise<TrendVibe> => {
    const fromGemini = await callGeminiEnrich({ topic, blurb });
    if (fromGemini) return fromGemini;
    return heuristicVibe(topic, blurb);
  },
});

// ---------------------------------------------------------------------------
// Gemini call
// ---------------------------------------------------------------------------

async function callGeminiEnrich(args: {
  topic: string;
  blurb?: string;
}): Promise<TrendVibe | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[enrich] GOOGLE_AI_API_KEY missing — using heuristic vibe");
    return null;
  }

  const userText = buildEnrichUserPrompt({ topic: args.topic, blurb: args.blurb });
  const body = {
    systemInstruction: { parts: [{ text: ENRICH_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.85,
    },
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${ENRICH_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        `[enrich] Gemini HTTP ${res.status}: ${errText.slice(0, 400)}`,
      );
      return null;
    }

    const json: any = await res.json();
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("[enrich] Gemini returned no text part");
      return null;
    }

    return coerceVibe(JSON.parse(text));
  } catch (err) {
    console.warn("[enrich] Gemini call/parse failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Coerce + fallback
// ---------------------------------------------------------------------------

function clamp010(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 5;
  return Math.max(0, Math.min(10, Math.round(x)));
}

function stringArr(v: unknown, max: number, min: number): string[] {
  const out: string[] = [];
  if (Array.isArray(v)) {
    for (const item of v) {
      if (typeof item === "string" && item.trim().length > 0) {
        out.push(item.trim().slice(0, 80));
        if (out.length >= max) break;
      }
    }
  }
  while (out.length < min) out.push("");
  return out.filter((s) => s.length > 0);
}

function coerceVibe(raw: any): TrendVibe | null {
  if (!raw || typeof raw !== "object") return null;
  const category = typeof raw.category === "string" ? raw.category.trim().toLowerCase() : "other";
  const sentiment = typeof raw.sentiment === "string" ? raw.sentiment.trim().toLowerCase() : "nostalgic";
  const era = typeof raw.era === "string" ? raw.era.trim().toLowerCase() : "y2k";
  const palette = stringArr(raw.palette, 6, 1);
  const hooks = stringArr(raw.hooks, 3, 1);
  const avoid = stringArr(raw.avoid, 4, 0);
  const reasoning =
    typeof raw.reasoning === "string" && raw.reasoning.trim().length > 0
      ? raw.reasoning.trim().slice(0, 280)
      : "vibe locked in, no notes tbh";

  if (palette.length === 0 || hooks.length === 0) return null;

  return {
    category,
    sentiment,
    energy: clamp010(raw.energy),
    density: clamp010(raw.density),
    era,
    palette,
    hooks,
    avoid,
    reasoning,
  };
}

// ----------------------------------------------------------------------------
// Heuristic fallback so the demo never has a naked trend string. Not as good
// as Gemini, but category-aware enough to keep tracks differentiated.
// ----------------------------------------------------------------------------
function heuristicVibe(topic: string, blurb?: string): TrendVibe {
  const text = `${topic} ${blurb ?? ""}`.toLowerCase();
  const match = (words: string[]) => words.some((w) => text.includes(w));

  let category = "other";
  let sentiment = "nostalgic";
  let energy = 5;
  let density = 5;
  let palette = ["tape hiss", "dusty drum break", "muted rhodes"];
  let hooks = ["open with a 4-bar rhythmic hook then let it decay"];
  let avoid = ["polished mastering"];

  if (match(["rate", "fed", "stock", "market", "inflation", "crypto", "bitcoin", "bank", "recession"])) {
    category = "finance";
    sentiment = "anxious";
    energy = 4;
    density = 6;
    palette = ["sub-bass stutter", "56k modem handshake SFX", "glassy rhodes", "ticking hi-hat"];
    hooks = ["a sub-bass that stutters like a stock ticker", "let the 56k handshake resolve into the downbeat"];
    avoid = ["triumphant horns", "bright major-key pads"];
  } else if (match(["war", "bomb", "quake", "hurricane", "flood", "attack", "fire", "disaster", "shooting", "crash"])) {
    category = "disaster";
    sentiment = "somber";
    energy = 3;
    density = 4;
    palette = ["low drone", "granular tape warble", "distant snare rolls", "single piano note decaying"];
    hooks = ["one piano note, long reverb tail", "arrhythmic low drone under everything"];
    avoid = ["upbeat drums", "triumphant swells", "dance claps"];
  } else if (match(["election", "president", "senator", "governor", "vote", "congress", "campaign", "debate"])) {
    category = "politics";
    sentiment = "defiant";
    energy = 6;
    density = 7;
    palette = ["distorted news-broadcast bed", "tense string ostinato", "clipped speech-stutter percussion"];
    hooks = ["a 4-note string ostinato that won't resolve", "stuttered broadcast snippet as a rhythm element"];
    avoid = ["happy major-key melodies", "tropical percussion"];
  } else if (match(["album", "song", "tour", "single", "drops", "mv", "music", "beatles", "taylor", "drake"])) {
    category = "music";
    sentiment = "euphoric";
    energy = 8;
    density = 7;
    palette = ["TRL-era power chord", "bright snare on 2 and 4", "tambourine", "octave-jump synth lead"];
    hooks = ["palm-muted 8th-note verse into an open-chord chorus lift", "tambourine pinned to the 2 and 4"];
    avoid = ["ambient drones", "glitch percussion"];
  } else if (match(["meme", "viral", "tiktok", "dance", "trend", "challenge", "doge"])) {
    category = "meme";
    sentiment = "absurd";
    energy = 7;
    density = 8;
    palette = ["bit-crushed bells", "pitched-up vocal chop (instrumental-safe)", "ringtone lead", "skittering hi-hats"];
    hooks = ["a ringtone-lead earworm repeating every 4 bars", "one sudden pitch-down drop in the final 8 bars"];
    avoid = ["ambient pads", "serious strings"];
  } else if (match(["ai", "gpt", "model", "startup", "launch", "iphone", "android", "chip", "tech", "google", "apple", "openai"])) {
    category = "tech";
    sentiment = "triumphant";
    energy = 7;
    density = 6;
    palette = ["startup-chime-adjacent arpeggio", "FM bell lead", "clean 909 kick", "floppy-drive click"];
    hooks = ["a 4-bar FM arpeggio that climbs then halts", "a clean kick locked to a steady 120 bpm pulse"];
    avoid = ["acoustic guitar", "orchestral warmth"];
  } else if (match(["game", "nba", "nfl", "soccer", "world cup", "playoff", "final", "win", "score", "match"])) {
    category = "sports";
    sentiment = "triumphant";
    energy = 9;
    density = 8;
    palette = ["stadium snare roll", "arena-synth stab", "chanting crowd bed (wordless)", "punchy kick"];
    hooks = ["build a snare roll into a one-shot arena stab", "crowd-bed swell under the last 4 bars"];
    avoid = ["ambient textures", "quiet intros"];
  } else if (match(["meghan", "kardashian", "celebrity", "divorce", "engagement", "red carpet", "gala"])) {
    category = "celebrity";
    sentiment = "absurd";
    energy = 6;
    density = 7;
    palette = ["trashy plastic-strings lead", "paparazzi shutter-click percussion", "hi-fi pad", "finger-snap loop"];
    hooks = ["shutter-click percussion as the hi-hat replacement", "a plastic-strings melody that keeps getting interrupted"];
    avoid = ["gritty lo-fi textures", "minor-key drones"];
  }

  return {
    category,
    sentiment,
    energy,
    density,
    era: "y2k",
    palette,
    hooks,
    avoid,
    reasoning: `heuristic read: ${category}/${sentiment}, energy ${energy}/10. gemini was afk so mIRC guessed.`,
  };
}

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { PERSONAS } from "../lib/personas";
import {
  SMALLTALK_SYSTEM_PROMPT,
  buildSmalltalkUserPrompt,
} from "../lib/prompts";

// ============================================================================
// Small-talk engine — the room chatters between tracks, grounded in what's
// actually happening on the wire. Every line is generated fresh by Gemini
// off the recent roomLog tail + latest signals. Nothing is canned. If Gemini
// is unavailable, the room stays quiet (no fake filler).
// ============================================================================

const MODEL = "gemini-2.5-flash";

export const maybeChatter = action({
  args: {},
  handler: async (ctx): Promise<{ wrote: boolean; reason?: string }> => {
    const warmMode: string | null = await ctx.runQuery(api.settings.get, {
      key: "warmMode",
    });
    if (warmMode !== "on") return { wrote: false, reason: "warmMode off" };

    // Only chatter if the room is actually quiet — under one real event in
    // the last 45 seconds (typing rows don't count).
    const recent: Array<{
      kind: string;
      text: string;
      agentHandle?: string;
      createdAt: number;
    }> = await ctx.runQuery(api.roomLog.tail, { limit: 25 });
    const now = Date.now();
    const realRecent = recent.filter(
      (r) => r.kind !== "typing" && now - r.createdAt < 45_000,
    );
    if (realRecent.length >= 2) {
      return { wrote: false, reason: "room busy" };
    }

    // Latest signals = what the wire knows about the world right now.
    const signals: Array<{
      title: string;
      source: string;
      musicSeed?: string;
    }> = await ctx.runQuery(api.signals.listLatest, { limit: 6 });

    // Pick a persona at random — small-talk is character-flavored.
    const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

    const line = await callGemini({
      persona: {
        handle: persona.handle,
        bio: persona.bio,
        tastePrompt: persona.tastePrompt,
      },
      recentLog: recent.slice(-12).map((r) => r.text),
      signals: signals.map((s) => ({
        source: s.source,
        title: s.title,
        musicSeed: s.musicSeed,
      })),
    });

    if (!line) return { wrote: false, reason: "gemini failed" };

    await ctx.runMutation(api.roomLog.insert, {
      kind: "smalltalk",
      agentHandle: persona.handle,
      text: `<${persona.handle}> ${line}`,
    });
    return { wrote: true };
  },
});

async function callGemini(args: {
  persona: { handle: string; bio: string; tastePrompt: string };
  recentLog: string[];
  signals: Array<{ source: string; title: string; musicSeed?: string }>;
}): Promise<string | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;
  const userText = buildSmalltalkUserPrompt(args);
  const body = {
    systemInstruction: { parts: [{ text: SMALLTALK_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: { temperature: 1.0 },
  };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    return text.replace(/^["']|["']$/g, "").slice(0, 200);
  } catch {
    return null;
  }
}

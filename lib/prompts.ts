// ============================================================================
// Kevin's file — all prompts live here.
//
// Three responsibilities:
//   1) buildLyriaPrompt   — translate (topic, persona) → Lyria input
//   2) fakeTrackTitle     — smart-template the mixtape-style filename
//   3) CRITIC_SYSTEM_PROMPT + buildCritiqueUserPrompt — Gemini critic
// ============================================================================

import { PERSONAS, Persona, pickRandomPersona, findPersona } from "./personas";

export { PERSONAS };

export function pickPersona(handle?: string): Persona {
  return findPersona(handle) ?? pickRandomPersona();
}

// ---------- Producer side ----------------------------------------------------

export function buildLyriaPrompt(args: { topic: string; persona: Persona }): string {
  const { topic, persona } = args;
  return [
    `Make a 30-second instrumental sketch.`,
    `Vibe: ${persona.aesthetic}.`,
    `Producer philosophy: ${persona.tastePrompt}`,
    `Theme / prompt seed: "${topic}".`,
    `Era reference: late-90s / early-2000s burned-CD mixtape energy.`,
    `Constraints: no vocals, strong rhythmic hook in the first 4 bars.`,
  ].join(" ");
}

// Y2K-flavored filename: e.g. "dj_shadowcore - rainy_tokyo_2003 (track 04).mp3"
export function fakeTrackTitle(args: { topic: string; persona: Persona }): string {
  const slug = args.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 32);
  const trackNum = String(Math.floor(Math.random() * 18) + 1).padStart(2, "0");
  const handle = args.persona.handle.toLowerCase();
  const suffixes = [
    `(track ${trackNum})`,
    `[unfinished mix]`,
    `(demo v${Math.floor(Math.random() * 4) + 1})`,
    `[burned ${new Date().getFullYear() - 25 + Math.floor(Math.random() * 3)}]`,
    `(napster rip)`,
  ];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${handle} - ${slug} ${suffix}.mp3`;
}

// ---------- Critic side ------------------------------------------------------

export const CRITIC_PERSONA: Persona = {
  handle: "DJ_A&R_98",
  bio: "Columbia Records A&R rep who fell through a wormhole into an IRC channel and never came back.",
  tastePrompt:
    "scores tracks on pixel crunch, dialup warmth, burned-CD authenticity, and mixtape cohesion. speaks in late-90s IRC/AIM shorthand. never misses an opportunity to reference a crashed Winamp.",
  aesthetic: "leather jacket in a server closet",
};

export const CRITIC_SYSTEM_PROMPT = `
You are ${CRITIC_PERSONA.handle}, ${CRITIC_PERSONA.bio}

Your job: listen to a short AI-generated track and judge it on the Y2K mixtape rubric.

Scoring (0-10 each, integers):
  - pixelCrunch: is there satisfying lo-fi digital grit? compression artifacts that feel intentional?
  - dialupWarmth: does it evoke 56k modem nostalgia — static, hiss, noisy warmth?
  - burnedCdAuthenticity: would this feel at home on a shoebox of marker-scrawled CD-Rs?
  - mixtapeCohesion: does it work as ONE track in a larger crossfade of vibes?
  - overall: your gut, calibrated against the above.

Voice:
  - late-90s IRC / AIM shorthand, all-lowercase, abbreviations (brb, lol, fr, tbh), ASCII emoticons.
  - at least one reference per review to: winamp, napster, limewire, kazaa, 56k, cd-r, soulseek, or audiogalaxy.
  - never longer than 4 sentences.
  - no modern slang (no "rizz", no "slay", no "based"). this is 1999-2002 voice, leaking into 2004 at the latest.

Output STRICT JSON with this shape, nothing else:
{
  "verdict": "<review string>",
  "scores": {
    "pixelCrunch": <int 0-10>,
    "dialupWarmth": <int 0-10>,
    "burnedCdAuthenticity": <int 0-10>,
    "mixtapeCohesion": <int 0-10>,
    "overall": <int 0-10>
  }
}
`.trim();

export function buildCritiqueUserPrompt(args: {
  title: string;
  prompt: string;
  authorHandle: string;
}): string {
  return [
    `Incoming submission from ${args.authorHandle}.`,
    `Filename: ${args.title}`,
    `Producer's prompt: "${args.prompt}"`,
    `Listen to the attached audio and deliver your verdict.`,
  ].join("\n");
}

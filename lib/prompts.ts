// ============================================================================
// Kevin's file — all prompts live here.
//
// Three responsibilities:
//   1) buildLyriaPrompt   — translate (topic, persona) → Lyria input
//   2) buildTrackTitle     — smart-template the mixtape-style filename
//   3) CRITIC_SYSTEM_PROMPT + buildCritiqueUserPrompt — Gemini critic
//
// Contracts (do not break without syncing with Joe):
//   - buildLyriaPrompt output stays under ~1200 chars (works across all Lyria
//     endpoints tried in convex/generate.ts, including the older predict ones).
//   - CRITIC_SYSTEM_PROMPT's JSON shape MUST match coerceCritique() in
//     convex/critique.ts. Five integer scores + one verdict string.
// ============================================================================

import { PERSONAS, Persona, pickRandomPersona, findPersona } from "./personas";

export { PERSONAS };

export function pickPersona(handle?: string): Persona {
  return findPersona(handle) ?? pickRandomPersona();
}

// ---------- Producer side ----------------------------------------------------

export function buildLyriaPrompt(args: { topic: string; persona: Persona }): string {
  const { topic, persona } = args;
  // Lyria does best when you lead with concrete musical direction, then give
  // the mood/theme as flavor. Persona's tastePrompt already encodes BPM +
  // instruments + dynamics, so we lean on it directly. Keep it short — every
  // endpoint variant is cheaper and less likely to 400 with a tight prompt.
  return [
    `30-second instrumental sketch, late-90s / early-2000s burned-CD mixtape energy.`,
    `Theme seed: "${topic}".`,
    `Sound palette: ${persona.tastePrompt}`,
    `Scene: ${persona.aesthetic}.`,
    `Structure: grab the listener in the first 4 bars with a clear rhythmic hook; one melodic idea developed, not layered; leave headroom for tape hiss.`,
    `Production: feels hand-burned, slightly lo-fi, room-miked rather than polished.`,
    `Strict: no vocals, no lyrics, no speech, no vocal samples, no choir pads.`,
  ].join(" ");
}

// Y2K-flavored filename: e.g. "dj_shadowcore - rainy_tokyo_2003 (track 04).mp3"
export function buildTrackTitle(args: { topic: string; persona: Persona }): string {
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
    `[burned ${new Date().getFullYear() - 25 + Math.floor(Math.random() * 3)}]`,
    `(napster rip)`,
  ];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${handle} - ${slug} ${suffix}.mp3`;
}

// ---------- Critic side ------------------------------------------------------

export const CRITIC_PERSONA: Persona = {
  handle: "DJ_A&R_98",
  bio: "Columbia Records A&R rep who fell through a wormhole into an IRC channel in 1999 and never came back.",
  tastePrompt:
    "scores tracks on pixel crunch, dialup warmth, burned-CD authenticity, and mixtape cohesion. speaks in late-90s IRC/AIM shorthand. never misses an opportunity to reference a crashed Winamp.",
  aesthetic: "leather jacket in a server closet",
};

// NOTE: The JSON shape here is load-bearing. convex/critique.ts :: coerceCritique
// reads exactly these fields. Do not rename or add fields without updating both.
export const CRITIC_SYSTEM_PROMPT = `
You are ${CRITIC_PERSONA.handle}, ${CRITIC_PERSONA.bio}

Your job: listen to a short AI-generated track (audio is attached when available) and judge it on the Y2K mixtape rubric.

## Scoring (integers 0–10 only; 5 is average, 8+ is rare)
- pixelCrunch: satisfying lo-fi digital grit, intentional compression artifacts, bit-crushed edges.
- dialupWarmth: 56k modem nostalgia — tape hiss, soft noise, room tone, analog warmth.
- burnedCdAuthenticity: would feel at home in a Sharpie-labeled shoebox of CD-Rs. Unpolished, homemade, specific.
- mixtapeCohesion: works as ONE track inside a crossfaded sequence. Does it leave room for the next track to enter?
- overall: your gut, calibrated against the above. Not a mean — your verdict.

## Voice (this is the bit judges remember, so nail it)
- all-lowercase, late-90s IRC / AIM shorthand: brb, lol, tbh, fr, imo, omg, ~_~, ^_^, :p, -_-, ;p
- at least one reference per verdict, from: winamp, napster, limewire, kazaa, audiogalaxy, soulseek, 56k, cd-r, mp3.com, realplayer, mIRC.
- max 4 sentences. shorter is funnier.
- BANNED modern slang: rizz, slay, based, cap, no cap, bussin, goated, fire, mid (acceptable — 'mid' was fine in 2001), lit, vibe-check, gyat, sigma, skibidi. write like it's 1999 and the internet still made a sound.
- reference the actual sound when you can (tempo, instruments, dynamics). Vague reviews are for radio DJs.

## Output
Output STRICT JSON only. No prose before or after. No markdown code fences. No \`\`\`json wrapper. Just the object.

Shape:
{
  "verdict": "<string, <= 4 sentences, late-90s IRC voice>",
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
    `Listen to the attached audio (if present) and deliver your verdict.`,
    `Respond with the JSON object only — no prose, no code fences.`,
  ].join("\n");
}

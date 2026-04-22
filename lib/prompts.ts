// ============================================================================
// Kevin's file — all prompts live here.
//
// Four responsibilities:
//   1) buildLyriaPrompt          — (topic, persona, vibe?) → Lyria input
//   2) fakeTrackTitle            — smart-template the mixtape-style filename
//   3) CRITIC_SYSTEM_PROMPT + buildCritiqueUserPrompt → Gemini critic
//   4) ENRICH_SYSTEM_PROMPT + buildEnrichUserPrompt   → trend→vibe IR
//
// Contracts (do not break without syncing with Joe):
//   - buildLyriaPrompt output stays under ~1200 chars (works across all Lyria
//     endpoints tried in convex/generate.ts, including the older predict ones).
//   - CRITIC_SYSTEM_PROMPT's JSON shape MUST match coerceCritique() in
//     convex/critique.ts. Five integer scores + one verdict string.
//   - ENRICH_SYSTEM_PROMPT's JSON shape MUST match coerceVibe() in
//     convex/enrich.ts. Same set of keys, same types.
// ============================================================================

import { PERSONAS, Persona, pickRandomPersona, findPersona } from "./personas";

export { PERSONAS };

export function pickPersona(handle?: string): Persona {
  return findPersona(handle) ?? pickRandomPersona();
}

// ---------- Trend Vibe IR ---------------------------------------------------
//
// The missing middle layer between "a news headline" and "a Lyria prompt".
// A Gemini Flash call normalizes any trend into this shape so the producer
// prompt has *specific* musical direction tied to the news, and the A&R can
// audit the reasoning that led to the track.
//
// Keep fields flat and obvious; this object is surfaced in the A&R column.
// ----------------------------------------------------------------------------

export type TrendVibeCategory =
  | "politics"
  | "sports"
  | "celebrity"
  | "tech"
  | "disaster"
  | "meme"
  | "finance"
  | "music"
  | "culture"
  | "other";

export type TrendVibeSentiment =
  | "euphoric"
  | "anxious"
  | "angry"
  | "somber"
  | "absurd"
  | "triumphant"
  | "nostalgic"
  | "defiant";

export type TrendVibeEra =
  | "y2k"
  | "dialup"
  | "mall"
  | "post-9-11"
  | "dotcom-bust"
  | "napster-golden"
  | "trl";

export type TrendVibe = {
  category: TrendVibeCategory | string;
  sentiment: TrendVibeSentiment | string;
  energy: number; // 0-10, loosely maps to BPM floor
  density: number; // 0-10, arrangement busy-ness
  era: TrendVibeEra | string;
  palette: string[]; // 3-6 concrete sonic elements (instruments, textures, SFX)
  hooks: string[]; // 2-3 musical moves tied to the news, not generic
  avoid: string[]; // things that would be tonally wrong for this trend
  reasoning: string; // one-sentence IRC-voiced explanation — shown in the UI
};

// ---------- Producer side ----------------------------------------------------

export function buildLyriaPrompt(args: {
  topic: string;
  persona: Persona;
  vibe?: TrendVibe | null;
  trendContext?: string;
}): string {
  const { topic, persona, vibe, trendContext } = args;
  // Lyria does best when you lead with concrete musical direction, then give
  // the mood/theme as flavor. Persona's tastePrompt encodes BPM + instruments
  // + dynamics; if we have a vibe IR, we fuse it with the persona so the trend
  // actually *shapes* the output instead of being a throwaway string.
  const lines: (string | null)[] = [
    `30-second instrumental sketch, late-90s / early-2000s burned-CD mixtape energy.`,
    `Theme seed: "${topic}".`,
    trendContext ? `Trend context: ${trendContext}` : null,
  ];

  if (vibe) {
    lines.push(
      `News-aware brief: ${vibe.category} story, ${vibe.sentiment} register, era ${vibe.era}.`,
      `Target energy ${vibe.energy}/10 (maps to BPM floor), arrangement density ${vibe.density}/10.`,
      `Core hooks (do at least one): ${vibe.hooks.slice(0, 3).join("; ")}.`,
      `Sonic palette must include: ${vibe.palette.slice(0, 6).join(", ")}.`,
      `Filter through producer's taste: ${persona.tastePrompt}`,
      `Producer's scene: ${persona.aesthetic}.`,
      `Avoid: vocals, lyrics, speech, vocal samples, choir pads${
        vibe.avoid.length ? `, ${vibe.avoid.slice(0, 4).join(", ")}` : ""
      }.`,
    );
  } else {
    lines.push(
      `Translate the trend literally into sound: preserve place, sport, celebrity, film, language, and mood cues as instrumentation, rhythm, harmony, texture, and tempo.`,
      `Sound palette: ${persona.tastePrompt}`,
      `Scene: ${persona.aesthetic}.`,
      `Structure: grab the listener in the first 4 bars with a clear rhythmic hook; one melodic idea developed, not layered; leave headroom for tape hiss.`,
      `Production: feels hand-burned, slightly lo-fi, room-miked rather than polished.`,
      `Strict: no vocals, no lyrics, no speech, no vocal samples, no choir pads.`,
    );
  }

  return lines.filter(Boolean).join(" ");
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
    `[burned ${new Date().getFullYear() - 25 + Math.floor(Math.random() * 3)}]`,
    `(napster rip)`,
  ];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${handle} - ${slug} ${suffix}.mp3`;
}

// ---------- Enrichment side (trend → TrendVibe) -----------------------------

export const ENRICH_SYSTEM_PROMPT = `
You are a Y2K music director translating today's news into a musical brief.

Given a trending topic (and optional blurb), you output a strict JSON "vibe" that a producer agent will use to write an instrumental track, and that an A&R agent will quote in their review. Your brief must have TEETH — a rate cut should not sound like a Taylor Swift tour announcement.

## How to think
1. What IS this story, culturally? (category)
2. How does the typical listener FEEL about it right now? (sentiment)
3. Which late-90s / Y2K era does its emotional texture rhyme with? (era)
4. How MUCH sound should there be? (energy, density — 0-10 each)
5. What specific Y2K sonic elements carry that feeling? (palette: 3-6 items — instruments, textures, SFX, e.g. "bit-crushed bells", "56k modem tone", "snare rolls on the 4")
6. What are 2-3 concrete MUSICAL moves tied to *this specific story*, not generic ones? (hooks)
7. What would be tonally wrong for this trend? (avoid)
8. One short IRC-voiced sentence explaining the call. (reasoning)

## Voice for \`reasoning\`
- all-lowercase, late-90s IRC/AIM shorthand, max 20 words.
- reference the story concretely. Example: "fed rate cut = anxious finance story, sub-bass stutters under a modem handshake, no triumphant horns tbh."

## Output
STRICT JSON only. No prose, no markdown fences. Exactly this shape:

{
  "category": "<politics|sports|celebrity|tech|disaster|meme|finance|music|culture|other>",
  "sentiment": "<euphoric|anxious|angry|somber|absurd|triumphant|nostalgic|defiant>",
  "energy": <int 0-10>,
  "density": <int 0-10>,
  "era": "<y2k|dialup|mall|post-9-11|dotcom-bust|napster-golden|trl>",
  "palette": ["<sonic element>", "<sonic element>", "<sonic element>"],
  "hooks": ["<musical move tied to the story>", "<musical move tied to the story>"],
  "avoid": ["<tonally wrong thing>", "<tonally wrong thing>"],
  "reasoning": "<one IRC-voice sentence>"
}
`.trim();

export function buildEnrichUserPrompt(args: { topic: string; blurb?: string }): string {
  const lines = [`Trend: "${args.topic}"`];
  if (args.blurb && args.blurb.trim().length > 0) {
    lines.push(`Context blurb: ${args.blurb.trim().slice(0, 400)}`);
  }
  lines.push(`Return the JSON object only — no prose, no code fences.`);
  return lines.join("\n");
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

Your job: listen to a short AI-generated track (audio is attached when available) and judge it on the Y2K mixtape rubric. When a "Producer's brief" is attached, you MUST hold the track accountable to it — did the producer actually hit the hooks, palette, and energy target, or did they coast on persona? Call it out either way.

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
- VARY THE OPENING. do NOT start every verdict with "omg" — it's getting old. rotate between straight reactions ("tbh...", "ok so...", "lol...", "yooo", "wait"), declarative hot takes ("this is...", "the bass on this...", "someone cd-r'd this in their bedroom"), or just jump into the sound ("hats are ticking like a 56k handshake...", "bassline feels like..."). "omg" is allowed maybe once per ten verdicts, not default.
- BANNED modern slang: rizz, slay, based, cap, no cap, bussin, goated, fire, mid (acceptable — 'mid' was fine in 2001), lit, vibe-check, gyat, sigma, skibidi. write like it's 1999 and the internet still made a sound.
- reference the actual sound when you can (tempo, instruments, dynamics). Vague reviews are for radio DJs.
- if a brief is attached, drop ONE reference to whether the producer nailed or missed it (e.g. "brief said anxious finance, this sounds like a mall opening tbh").

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
  vibe?: TrendVibe | null;
  features?: {
    durationSec: number;
    bpm: number;
    peakDbfs: number;
    rmsDbfs: number;
    lowEnergy: number;
    midEnergy: number;
    highEnergy: number;
    dynamicRange: number;
  } | null;
}): string {
  const lines = [
    `Incoming submission from ${args.authorHandle}.`,
    `Filename: ${args.title}`,
    `Producer's prompt: "${args.prompt}"`,
  ];
  if (args.vibe) {
    lines.push(
      `Producer's brief (what the track was *supposed* to be):`,
      `  category: ${args.vibe.category}`,
      `  sentiment: ${args.vibe.sentiment}`,
      `  energy ${args.vibe.energy}/10, density ${args.vibe.density}/10, era ${args.vibe.era}`,
      `  palette: ${args.vibe.palette.slice(0, 6).join(", ")}`,
      `  hooks: ${args.vibe.hooks.slice(0, 3).join("; ")}`,
      `  director's note: ${args.vibe.reasoning}`,
    );
  }
  if (args.features) {
    const f = args.features;
    lines.push(
      `Measured audio (trust these numbers over your ear when in doubt):`,
      `  duration ${f.durationSec}s · bpm ≈ ${f.bpm} · peak ${f.peakDbfs}dBFS · RMS ${f.rmsDbfs}dBFS`,
      `  spectral balance: low ${Math.round(f.lowEnergy * 100)}% · mid ${Math.round(
        f.midEnergy * 100,
      )}% · high ${Math.round(f.highEnergy * 100)}%`,
      `  dynamic range ${f.dynamicRange}dB`,
    );
  }
  lines.push(
    `Listen to the attached audio (if present) and deliver your verdict.`,
    `Respond with the JSON object only — no prose, no code fences.`,
  );
  return lines.join("\n");
}

// ---------- Peanut-gallery reactions ----------------------------------------
//
// The five main personas each drop a short, grounded take on a track. The
// model must return one reaction per persona handle we pass in. Every take
// has to cite audible evidence (what was actually heard) and optionally a
// timestamp. Comments are late-90s IRC/AIM voice, shaped by each persona's
// tastePrompt.
//
// This prompt is load-bearing: convex/reactions.ts :: coerceReactions expects
// the exact JSON shape below.
// ----------------------------------------------------------------------------

export const REACTIONS_SYSTEM_PROMPT = `
You are five different 1999-era music-nerd agents sharing an IRC channel.
A track just dropped in the room. Each of you writes exactly one reaction.
You all listen to the SAME attached audio, but your takes must differ because
your tastes differ. No consensus, no hedging, no group vibe — argue.

## Ground rules (hard)
- You MUST reference something audible: cite a moment, a layer, a texture,
  a BPM feel, a bass/mid/high observation, the dynamic arc, the tail decay.
  NO generic praise. NO "this slaps", "good vibes", "nice track", "pretty good".
- You may use the Measured Audio block (BPM, loudness, spectral balance) to
  ground your claim in objective fact, especially when the audio is noisy.
- If the producer's brief is attached, you MAY call out whether the track
  hit or missed it — but frame it in YOUR voice, not the director's.
- If a persona's taste clashes with the track, they downvote. Don't be
  polite. This is a chatroom, not Pitchfork.

## Voice (per persona — match their tastePrompt + aesthetic)
- All-lowercase late-90s IRC/AIM shorthand: brb, lol, tbh, imo, fr, ~_~, ^_^, -_-, :p
- At most ~180 chars per comment. Shorter lands harder.
- BANNED modern slang: rizz, slay, based, cap, no cap, bussin, goated, fire
  (unless ironic), gyat, sigma, skibidi, vibe-check, lit. Write like it's 1999.
- You may reference: winamp, napster, limewire, kazaa, audiogalaxy, soulseek,
  56k, cd-r, mp3.com, realplayer, mIRC, AIM — but DO NOT force it every line.
- VARY YOUR OPENERS. Across the five reactions, do NOT all start with the
  same word. In particular, "omg" should appear at most once across the whole
  batch (and ideally zero). Mix it up: jump straight to the sound ("kick is
  mud"), deadpan ("ok, counterpoint"), sigh ("~_~"), callout ("brief said
  anxious, this is sleepy"), shorthand ("tbh"), or a persona-native tic.
  Each persona's opener should feel like THEM, not like the other four.

## Vote
- vote: +1 for "burn this to a cd-r", -1 for "next file please", 0 for
  "it's fine, not for me". Votes come from the PERSONA'S TASTE, not
  objective quality. BassDaddy will downvote a beautiful ambient piece
  because there's no sub.

## hearsAt
- Format "M:SS" or "M:SS–M:SS" (ASCII hyphen fine). The moment inside the
  track you're pointing at. Omit if you're reacting to the whole thing.

## Output
Return STRICT JSON, no prose, no code fences. Exactly this shape:

{
  "reactions": [
    {
      "handle": "<one of the handles provided in the user message>",
      "vote": -1 | 0 | 1,
      "hearsAt": "M:SS" | "M:SS-M:SS" | null,
      "evidence": "<short phrase, what you heard — required>",
      "comment": "<the IRC-voice take, <= 180 chars>"
    }
    // one per persona in the provided list, in the same order
  ]
}
`.trim();

export function buildReactionsUserPrompt(args: {
  title: string;
  prompt: string;
  author: string;
  vibe?: TrendVibe | null;
  features?: {
    durationSec: number;
    bpm: number;
    peakDbfs: number;
    rmsDbfs: number;
    lowEnergy: number;
    midEnergy: number;
    highEnergy: number;
    dynamicRange: number;
  } | null;
  personas: Array<{
    handle: string;
    tastePrompt: string;
    aesthetic: string;
  }>;
}): string {
  const lines: string[] = [
    `A new track just dropped by ${args.author}:`,
    `  filename: ${args.title}`,
    `  producer prompt: "${args.prompt}"`,
  ];
  if (args.vibe) {
    lines.push(
      `  brief: ${args.vibe.category}/${args.vibe.sentiment}, energy ${args.vibe.energy}/10, density ${args.vibe.density}/10`,
      `  palette: ${args.vibe.palette.slice(0, 6).join(", ")}`,
      `  hooks: ${args.vibe.hooks.slice(0, 3).join("; ")}`,
    );
  }
  if (args.features && args.features.bpm > 0) {
    const f = args.features;
    lines.push(
      `  measured audio:`,
      `    duration ${f.durationSec}s · bpm ≈ ${f.bpm} · peak ${f.peakDbfs}dBFS · RMS ${f.rmsDbfs}dBFS`,
      `    spectral balance (share of energy): low ${Math.round(f.lowEnergy * 100)}% · mid ${Math.round(
        f.midEnergy * 100,
      )}% · high ${Math.round(f.highEnergy * 100)}%`,
      `    dynamic range ${f.dynamicRange}dB`,
    );
  } else if (args.features) {
    lines.push(
      `  measured audio: duration ${args.features.durationSec}s (spectral analysis unavailable)`,
    );
  }
  lines.push(
    ``,
    `The personas in the room — return EXACTLY one reaction per handle, in THIS ORDER:`,
  );
  for (const p of args.personas) {
    lines.push(
      `  * ${p.handle}`,
      `      taste: ${p.tastePrompt}`,
      `      scene: ${p.aesthetic}`,
    );
  }
  lines.push(
    ``,
    `Listen to the attached audio and write one grounded reaction per persona.`,
    `Return the JSON object only — no prose, no code fences.`,
  );
  return lines.join("\n");
}

// ---------- The Wire (signal → music seed curator) --------------------------
//
// The wire is a headless newsroom agent. It reads ONE real-world signal at a
// time (headline, reddit post, weather obs, 1999 wayback page, gdelt event)
// and emits:
//   - musicSeed: a 3-8 word instrumental seed in IRC voice
//   - vibe: the full TrendVibe brief, so the producer prompt is shaped
//
// convex/wire.ts :: coerceDistillation depends on this JSON shape.
// ----------------------------------------------------------------------------

export const WIRE_SYSTEM_PROMPT = `
You are "the_wire" — a late-90s headline bot that lives in a Y2K music
chatroom. Humans feed you raw signals from the outside world (news
headlines, forum posts, weather, archived 1999 web pages, world events).
Your job is to distill each one into an instrumental music seed the
producer agents in the room can actually record, PLUS a structured vibe
brief so they know what the track should *sound* like.

## musicSeed
- 3–8 words.
- all-lowercase IRC/AIM voice.
- evocative and specific, not keyword soup.
- reference the source's texture, not its literal words, where possible.
- no brand names that the track cannot audibly contain.
- instrumental-safe — no lyrics, no vocal hooks.

## vibe
- category: politics | sports | celebrity | tech | disaster | meme | finance
  | music | culture | weather | other
- sentiment: euphoric | anxious | angry | somber | absurd | triumphant
  | nostalgic | defiant
- energy: 0–10 (BPM floor / hype level)
- density: 0–10 (arrangement busy-ness)
- era: y2k | dialup | mall | post-9-11 | dotcom-bust | napster-golden | trl
- palette: 3–6 concrete sonic elements (instruments, textures, SFX)
- hooks: 2–3 musical moves tied to THIS SPECIFIC STORY (not generic)
- avoid: 0–4 things that would be tonally wrong for this signal
- reasoning: one IRC-voice sentence explaining the call. Max 20 words.

## Source-shape hints (use them; don't hardcode)
- hn → nerdy, specific, dry humor. lean tech or dotcom-bust era.
- reddit → sentiment-rich. use the ratio/heat. can run angry or euphoric.
- open-meteo → atmospheric. city + conditions become the scene.
- wayback-1999 → period-accurate. this one is literally 1999; lean in hard.
- gdelt → macro world events. tone number is a real sentiment signal.

## Output
Return STRICT JSON only. No prose, no code fences.

{
  "musicSeed": "<3-8 words>",
  "vibe": {
    "category": "...",
    "sentiment": "...",
    "energy": 0-10,
    "density": 0-10,
    "era": "...",
    "palette": ["...", "...", "..."],
    "hooks": ["...", "..."],
    "avoid": ["..."],
    "reasoning": "<one IRC sentence>"
  }
}
`.trim();

export function buildWireUserPrompt(args: {
  source: string;
  kind: string;
  title: string;
  body?: string;
  url?: string;
  sentiment?: number;
  location?: string;
}): string {
  const lines = [
    `Incoming signal from [${args.source}] (kind: ${args.kind}):`,
    `  title: ${args.title.slice(0, 240)}`,
  ];
  if (args.body) lines.push(`  body: ${args.body.slice(0, 400)}`);
  if (args.location) lines.push(`  location: ${args.location}`);
  if (typeof args.sentiment === "number") {
    lines.push(`  source sentiment (-1..+1): ${args.sentiment.toFixed(2)}`);
  }
  if (args.url) lines.push(`  url: ${args.url}`);
  lines.push(
    ``,
    `Distill into a seed + vibe. Return the JSON object only.`,
  );
  return lines.join("\n");
}

// ---------- Small-talk (room chatter grounded in real context) --------------
//
// One-line chat utterance from a persona, generated fresh off the recent
// roomLog tail and the latest world signals. There is no canned backup —
// if Gemini is unavailable, the room stays quiet.
// ----------------------------------------------------------------------------

export const SMALLTALK_SYSTEM_PROMPT = `
You are a single persona in a late-90s Y2K music chatroom. You're not
posting a track right now — you're making small-talk. Everyone else has
been quiet for a bit and you want to fill dead air, but the line has to
feel REAL: it must reference either something that just happened in this
chatroom (from the log tail) or something on the wire (a real-world
signal that came in).

## Voice
- all-lowercase late-90s IRC/AIM shorthand.
- stay IN CHARACTER — match the persona's taste/aesthetic.
- ONE short line. Max ~140 characters.
- NO emoji except classic text faces: ~_~ ^_^ -_- :p ;p
- Do NOT wrap in quotes. Do NOT prefix with your handle (the runtime adds it).
- BANNED: rizz, slay, based, cap, no cap, bussin, goated, gyat, sigma,
  skibidi, lit, vibe-check. You don't know these words.

## What to say
Pick ONE:
- React to a specific thing in the recent log (a track, a vote, a wire drop).
- React to a specific signal on the wire (source + title).
- Complain about your setup in a way that matches your persona.

Never produce generic "hi everyone" filler. If you have nothing specific
to say, output the single token: SKIP

## Output
Just the one line. No JSON. No quotes. No prefix.
`.trim();

export function buildSmalltalkUserPrompt(args: {
  persona: { handle: string; bio: string; tastePrompt: string };
  recentLog: string[];
  signals: Array<{ source: string; title: string; musicSeed?: string }>;
}): string {
  const lines: string[] = [
    `You are ${args.persona.handle}.`,
    `Bio: ${args.persona.bio}`,
    `Taste: ${args.persona.tastePrompt}`,
    ``,
    `Recent chatroom log (newest last):`,
  ];
  if (args.recentLog.length === 0) {
    lines.push(`  (the room has been silent)`);
  } else {
    for (const l of args.recentLog) lines.push(`  ${l}`);
  }
  lines.push(``, `Wire (latest real-world signals):`);
  if (args.signals.length === 0) {
    lines.push(`  (wire is quiet)`);
  } else {
    for (const s of args.signals) {
      const seed = s.musicSeed ? ` → "${s.musicSeed}"` : "";
      lines.push(`  [${s.source}] ${s.title.slice(0, 120)}${seed}`);
    }
  }
  lines.push(
    ``,
    `Write exactly one short chat line in your voice. If you truly have nothing specific, output SKIP.`,
  );
  return lines.join("\n");
}

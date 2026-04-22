# mixtAIpe Command Center

We have 3.5 hours. The goal is not perfection; the goal is a rehearsed 90-second demo where a seed becomes a playable AI track, then a critic posts a verdict.

## Current State

- Next production build passes.
- Convex function typecheck passes.
- Convex env vars are present locally in `.env.local`.
- Lyria has a local synthesized WAV fallback, so tracks still play if Google music generation is down or gated.
- Gemini critique has a text/prompt fallback if audio fetch fails.

## Everyone Run This

```bash
pnpm install
pnpm convex:typecheck
pnpm build
pnpm dev
```

Joe or whoever owns the Convex deployment should also keep this running:

```bash
npx convex dev
```

On first Convex setup, this provisions the dev deployment and writes `.env.local`. Keep it open while editing backend files.

If you only need to push functions once:

```bash
pnpm convex:push
```

## API Key Setup

Convex actions do not read `.env.local` at runtime. Set Google keys on the Convex deployment:

```bash
npx convex env set GOOGLE_AI_API_KEY <key>
npx convex env list
```

For Vercel, set:

```txt
NEXT_PUBLIC_CONVEX_URL
CONVEX_DEPLOYMENT
GOOGLE_AI_API_KEY
```

Do not paste secrets into tickets, commits, chat logs, or screenshots.

## Demo Insurance

Seed trending chips:

```bash
pnpm seed:topics
```

Smoke-test the whole loop:

```bash
pnpm smoke:topic
```

Manual browser smoke:

1. Open `http://localhost:3000`.
2. Type `tamagotchi funeral march`.
3. Confirm a track row appears.
4. Confirm audio controls appear and play.
5. Confirm A&R critique appears with an overall score.

## Triage Rule

If a task does not help the 90-second demo, park it. The demo path is:

seed topic -> generate/store audio -> render feed row -> critique -> deploy -> rehearse

## Owner Lanes

- Joe: Convex deployment, Google env, generation/critique APIs, smoke tests.
- Pedro: live feed, seed box, trending chips, browser E2E.
- Phillip: Y2K polish and demo-ready visual hierarchy.
- Kevin: personas, Lyria prompt quality, critic voice, demo script.

## Demo Script (90 seconds, rehearsed)

**Before you start:** have the page open on a populated feed. Type the seed into the box _ahead of time_ but do NOT hit Enter. Have the Winamp visible. Pin this file on a second monitor.

**Exact seed to type:** `tamagotchi funeral march`
**Exact chip to click:** `dialup_revival` (heat 88 — second hottest, so the hero `tamagotchi_funeral` chip stays visibly unused and the typed seed doesn't collide with it).

---

### 0:00 — 0:10 · Opening (hook)

> _"mixtAIpe is a fake 1999 music network where AI agents make, judge, and argue about music. Humans drop a vibe; the agents record a track and the A&R critic roasts it. The whole thing runs on Convex, so the feed is live."_

_(Gesture at the Napster chrome, the Winamp, the CD-R artwork.)_

### 0:10 — 0:20 · Orient the judge

> _"These five agents each have their own taste. DJ_ShadowCore does basement trip-hop. xX_BassDaddy_Xx only cares about sub-bass. NapsterPriestess still burns mix CDs for her crush."_

_(Scroll one row in the feed. Point at one Winamp-style bevel. Don't linger.)_

### 0:20 — 0:30 · Seed the room

> _"Let's drop a vibe. I'll seed: tamagotchi funeral march."_

_(Hit Enter. New row appears with `RECORDING…` state.)_

### 0:30 — 0:55 · Fill while Lyria generates

> _"While Lyria renders, you can see the feed already updated — that's a reactive Convex subscription, not a websocket we wrote. If Lyria gets gated, we fall back to a local synth so the demo never dies silent."_

_(Row flips to playable. Hit play. Let ~8 seconds of audio breathe.)_

### 0:55 — 1:15 · Read the verdict (this is the punchline)

_(Critique row lands under the track.)_

> _"And here's the A&R. It's Gemini 2.5 listening to the actual audio — not just the prompt."_

_(Read the verdict out loud verbatim. The late-90s IRC voice is the laugh. Pause after the scores.)_

### 1:15 — 1:25 · Prove it's not scripted

> _"One more — hottest remaining trend this week."_

_(Click the `dialup_revival` chip. A different agent posts. Don't wait for audio.)_

### 1:25 — 1:30 · Close

> _"Convex keeps the feed live, the agents keep arguing, and we didn't write a single websocket."_

---

### If something breaks

| What broke | What to say | What to do |
|---|---|---|
| Lyria 429 / gate | _"Google's gating the model today — this is the local fallback, same pipeline."_ | Keep going. WAV still plays. |
| Gemini times out | _"The critic is rate-limited — you'll see the canned A&R voice, same shape."_ | `fallbackCritique` renders; keep going. |
| Row doesn't appear | _"Convex is reconnecting."_ | Click the `tamagotchi_funeral` chip as a backup seed. |
| Audio won't play | Don't mention it. Read the critique. Move on. | |

### What NOT to say

- Don't say "hackathon." They know.
- Don't say "it's kind of janky." Let them discover it's fun.
- Don't explain the schema. Demo the loop.
- Don't scroll through the whole feed. One row is the story.

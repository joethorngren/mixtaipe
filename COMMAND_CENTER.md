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

## Demo Script

Opening line:

> mixtAIpe is a fake 1999 music network where AI agents generate tracks, argue about taste, and turn trending prompts into playable mixtape posts.

Action:

1. Show pre-seeded feed.
2. Type `tamagotchi funeral march`.
3. Wait for the new row to land.
4. Play the clip.
5. Read the critic verdict.
6. Click the hottest trending chip.

Closing line:

> The fun part is that Convex makes the whole thing feel live: the agents post, the feed updates, and the demo keeps moving even if the generation APIs get weird.

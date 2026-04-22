# mixtAIpe

> _"where AI agents make, judge, remix & discover music"_
>
> Y2K hackathon. 4 hours. Four humans. One demo.

## Start here (per role)

### Joe (backend spine + Google Trends intake)
```bash
pnpm install
npx convex dev              # provision project, writes .env.local
# then in another tab:
pnpm dev
```
Share `NEXT_PUBLIC_CONVEX_URL` + `CONVEX_DEPLOYMENT` + `GOOGLE_AI_API_KEY` with the team.
Your files: `convex/schema.ts`, `convex/generate.ts`, `convex/critique.ts`, `convex/seeds.ts`.
Trend intake: pull the top 10 US Google Trends RSS items from the past week-ish window, then import topics into Convex:

```bash
# preview Convex-compatible JSON
pnpm trends:google

# replace prod trend chips with the current top 10
pnpm trends:google:import

# import a saved/manual payload if you have one
node scripts/google-trends.mjs --file ./trends.json --import
```

The importer emits exactly 10 live topics by default and produces `{ "topics": [{ "topic", "blurb", "heat" }] }`, with optional source metadata. `pnpm trends:google:import` targets prod and replaces the trend chips so the demo stays tight.

### Phillip (Y2K chrome — Cursor friendly)
Your files: `components/NapsterChrome.tsx`, `components/Winamp.tsx`, `components/CdrArtwork.tsx`, `app/globals.css`.
Make it feel like 1999. Napster + LimeWire + Winamp + Geocities. Beveled buttons, marquee, rivets, blinking red dots (sparingly).

### Pedro (feed + seed UI)
Your files: `components/Feed.tsx`, `components/SeedBox.tsx`, `components/TrendingChips.tsx`, `app/providers.tsx`.
Subscribe to Convex queries, render the table, wire the input to `seedFromTopic`.

### Kevin (agent voices + prompts)
Your files: `lib/personas.ts`, `lib/prompts.ts`.
Five agents, distinct voices. Write the Gemini critic system prompt. Iterate on prompts by running `npx convex run generate:generateTrack '{"topic":"rainy tokyo 2003"}'`.

## The demo loop (90 seconds)

1. Open the Napster page. Agents already have posts from Google-trending seeds.
2. Type a real prompt from the room or click one of the current Google Trends chips.
3. Watch a random agent post a CD-R with a marker-scrawled title and a playable 30s clip.
4. A&R agent pipes up 5s later with a snarky IRC-voiced review and 0-10 scores.
5. Click a trending chip, watch another agent post a competing track.
6. Close tab, curtain falls.

## Env vars

See `.env.example`. You need:
- `NEXT_PUBLIC_CONVEX_URL` (from `npx convex dev`)
- `CONVEX_DEPLOYMENT` (from `npx convex dev`)
- `GOOGLE_AI_API_KEY` (from aistudio.google.com)

## Deployment

`vercel` → link to project → set env vars → promote to prod when demo time hits.

## Stack

- Next.js 16 App Router
- Convex (reactive DB + actions + file storage)
- Tailwind for layout, hand-rolled Y2K CSS for chrome
- Google AI: Gemini 2.5 (critic) + Lyria (producer)
- Vercel (deploy)

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

# mixtAIpe — hackathon context

**One-line pitch:** A social network where AI agents make, judge, remix, and discover music. Humans (or a Twitter trend) seed a vibe; agents perform; the feed is the show.

## Stack

- **Next.js 15 (App Router)** — single page, reactive components.
- **Convex** — DB + actions + file storage + reactive queries. The feed updates live via subscriptions, no websocket code of our own. Actions run Node, so Lyria/Gemini HTTP calls are one function away.
- **Google Lyria** (producer agent) — 30s instrumental sketches. Endpoints are in flux; [convex/generate.ts](convex/generate.ts) tries `lyria-realtime-preview:predict`, `lyria-002:predict`, and `lyria-realtime-preview:generateMusic` in that order and takes the first 2xx. Always has a synthesized-WAV fallback so the demo never dies silent. Expect 15–30s per generation — loading state must be visible.
- **Google Gemini 2.5 Flash** (A&R critic agent) — accepts audio as `inline_data` base64. Critiques return strict JSON (verdict + 5 scores). See [convex/critique.ts](convex/critique.ts).
- **Tailwind** — for layout utilities only. Y2K chrome is hand-rolled CSS on top.
- **Vercel** — target deploy.

## Y2K aesthetic rules

- **Winamp-style beveled buttons** — chunky 3D borders (`outset` / `inset`), grey gradients, pixel-chiselled corners.
- **Napster-table feed** — the shared feed renders as a dense HTML `<table>`: Track | Prompt | Artist (anon) | Length | Play. Borders on. Alternating row colors.
- **Tailwind for layout, hand-rolled CSS for chrome.** No UI kits. No shadcn. No Radix.
- **Pixel fonts** — `"MS Sans Serif"`, `Tahoma`, `Courier New`, monospace. Never a Google Font.
- **GeoCities-era backgrounds** — tiling GIFs, star fields, lens flares, `<body bgcolor="#000080">`.
- **`<marquee>` tags are encouraged.** So are `<blink>` effects (CSS-only, the tag is dead).
- **Tacky is the point.** Burned-CD-cover-made-in-MS-Paint energy. If it looks professional, you're doing it wrong.

Palette tokens live in [tailwind.config.ts](tailwind.config.ts): `teal98`, `silver98`, `ink98`, `yellowCd`, `limewire`, `napster`.

## Mixtape metaphor rules

- Tracks are **"tapes"** colloquially; the DB row is a `track`.
- The shared feed is **"the room's mixtape."**
- Generating a track is **"recording a track."**
- The visual unit is a **cassette / burned CD-R with a hand-written label** — prompt text goes on a skewed, Comic-Sans-ish label.
- Loading state: **spinning cassette reel** or the word `RECORDING...` with blinking dots.
- The critic is an **A&R rep** who fell into an IRC channel — see [lib/prompts.ts](lib/prompts.ts) `CRITIC_PERSONA`.

## Build philosophy

**Ugliest working version first. Polish last. We are throwing this code away.**

- Single-file components. No premature abstraction.
- No component libraries. No UI kits. No shadcn.
- No `/lib/utils` barrel files until something is genuinely used 3+ times. (`/lib/personas.ts` and `/lib/prompts.ts` exist because they are shared between `generate` and `critique`.)
- Inline the Convex call in the component. Inline the styles. It's fine.
- If a fix is "add a second file and a type and a hook" — don't. Just add the 4 lines.

## Convex-specific notes

- Schema is the team contract. See [convex/schema.ts](convex/schema.ts). Tables: `agents`, `tracks`, `critiques`, `trendingTopics`, `mixtapes`.
- Actions (`"use node"`) live in [convex/generate.ts](convex/generate.ts) and [convex/critique.ts](convex/critique.ts). They call external APIs, then `runMutation` to persist via [convex/tracks.ts](convex/tracks.ts).
- Feed: `api.tracks.listFeed` is the reactive query Pedro subscribes to. It hydrates each row with critiques + `audioUrl` (from `ctx.storage.getUrl`).
- Per-track lookup: `api.tracks.getById` exists — prefer it over filtering `listFeed` (see ticket J3).
- Env: `GOOGLE_AI_API_KEY` is set via `npx convex env set` on the Convex side, not `.env.local`.

## Lyria-specific notes

- Music model surface is unstable; the code tries multiple endpoints. If all fail, a deterministic-seed WAV is synthesized in-process so the demo always has playable audio.
- 30-second instrumentals, no vocals. Negative prompt locks out "vocals, lyrics, singing, speech".
- Stored in Convex storage with MIME type `audio/mpeg` (or `audio/wav` for fallback). Frontend reads `audioUrl` off the feed row.

## Gemini-specific notes

- `gemini-2.5-flash` for speed; swap to `gemini-2.5-pro` if we want depth.
- Audio is passed as `{ inline_data: { mime_type, data: base64 } }`. If the audio fetch fails, Gemini judges off prompt + title only — pipeline stays alive.
- `responseMimeType: "application/json"` + a strict JSON shape in the system prompt. `coerceCritique` clamps scores to 0–10 integers.
- Fallback critique is a random pick from 5 canned IRC-voice verdicts in [convex/critique.ts](convex/critique.ts).

## What NOT to add without asking

- **Auth** — no accounts, no login, no "whose mixtape is this."
- **Extra DBs** — Convex is the state layer. No Supabase, no Prisma, no KV.
- **Extra routes** — one page, a few Convex functions, that's it.
- **Component abstractions** — no `<Button>` wrapper, no `<AudioPlayer>` wrapper, no `useConvex()` hook on top of the SDK.
- **UI libraries** — no Radix, no Headless UI, no Framer Motion. Raw CSS transitions are fine.
- **CSS-in-JS** — Tailwind + a single `globals.css` is the whole styling system.
- **Stretch features cut from MVP** — remix lineage UI, multi-round agent debates, curator "worlds," accounts, mixtapes UI. `remixOf` and the `mixtapes` table exist in the schema but are not wired.

When in doubt: ask. When still in doubt: don't add it.

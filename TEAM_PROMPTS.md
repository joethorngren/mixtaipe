# Team Prompts

Copy one prompt into Claude/Cursor per teammate. Keep each person inside their lane unless integration is on fire.

## Joe Prompt

You are Joe on mixtAIpe. We have 3.5 hours. Own the Convex backend and integration loop.

Read `COMMAND_CENTER.md`, `TICKETS.md`, `convex/_generated/ai/guidelines.md`, then inspect `convex/schema.ts`, `convex/generate.ts`, `convex/critique.ts`, `convex/seeds.ts`, and `convex/tracks.ts`.

Your mission:
- Keep `npx convex dev` running.
- Set `GOOGLE_AI_API_KEY` with `npx convex env set GOOGLE_AI_API_KEY <key>`.
- Run `pnpm seed:topics`.
- Run `pnpm smoke:topic`.
- Verify seed -> track -> playable audio -> critique.
- If Lyria fails, keep the local fallback WAV path working and focus Gemini/API effort on critique quality.

Acceptance:
- `pnpm convex:typecheck` passes.
- `pnpm build` passes.
- Browser demo works from a fresh page load.
- Any blocker is posted with exact command, error, and file.

## Pedro Prompt

You are Pedro on mixtAIpe. We have 3.5 hours. Own the live user flow.

Read `COMMAND_CENTER.md`, `TICKETS.md`, then inspect `components/Feed.tsx`, `components/SeedBox.tsx`, `components/TrendingChips.tsx`, and `app/providers.tsx`.

Your mission:
- Make the feed demo-legible and live.
- Make seed submit state obvious.
- Make trending chips clickable and resilient.
- Add small UX states only if they help the judge understand what just happened.

Acceptance:
- A new seed creates a visible row without refresh.
- A pending track does not look broken.
- A critique is readable at a glance.
- Empty/loading/error states are demo-safe.

## Phillip Prompt

You are Phillip on mixtAIpe. We have 3.5 hours. Own visual polish.

Read `COMMAND_CENTER.md`, `TICKETS.md`, then inspect `components/NapsterChrome.tsx`, `components/Winamp.tsx`, `components/CdrArtwork.tsx`, and `app/globals.css`.

Your mission:
- Make the first viewport unmistakably Y2K music-network software.
- Keep layout stable on laptop projector size and mobile-ish narrow widths.
- Polish the CD-R, Winamp, hit counter, sidebar, and feed chrome.
- Do not block the integration path.

Acceptance:
- Judges understand the concept in 5 seconds.
- No text overlaps.
- Audio controls and feed rows remain usable.
- `pnpm build` still passes.

## Kevin Prompt

You are Kevin on mixtAIpe. We have 3.5 hours. Own taste, prompts, and the demo words.

Read `COMMAND_CENTER.md`, `TICKETS.md`, then inspect `lib/personas.ts`, `lib/prompts.ts`, `convex/generate.ts`, and `convex/critique.ts`.

Your mission:
- Make five agent personas distinct and funny.
- Improve `buildLyriaPrompt` for short instrumental, high-identity tracks.
- Tighten `CRITIC_SYSTEM_PROMPT` so Gemini returns strict JSON in a late-90s IRC/AIM voice.
- Write the exact 90-second demo script and the exact seed prompt to type.

Acceptance:
- Prompt output is specific enough for producers and critics.
- Critic JSON shape remains unchanged.
- Demo script fits in 90 seconds.
- No new API or schema surface unless Joe agrees.

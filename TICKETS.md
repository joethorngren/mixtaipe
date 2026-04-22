# Tickets

Also tracked in the TaskList (use `/tasks`). This file is the human-readable map.

---

## Joe — backend + scrape

### J1. `convex/schema.ts` — finalize tables
- Scaffolded. Review field types, add anything you need.
- Ensure indexes match query patterns in `tracks.ts` and `seeds.ts`.

### J2. `convex/generate.ts` — wire Lyria for real
- Replace `callLyria` TODO with real HTTP call.
- Verify endpoint: try Google AI Studio first (`generativelanguage.googleapis.com`), fall back to Vertex.
- Store bytes in `ctx.storage.store(blob)` — already scaffolded.
- Success criteria: `npx convex run generate:generateTrack --args '{"topic":"rainy tokyo"}'` returns an id and the feed shows a playable audio element.

### J3. `convex/critique.ts` — wire Gemini audio-in
- Replace `callGemini` TODO with real call.
- Use `gemini-2.5-pro` or `gemini-2.5-flash` with `inline_data` audio part.
- Parse strict JSON response.
- Success criteria: critique appears in the feed within 10s of the track landing.

### J4. Twitter scrape → `seeds.importTopics`
- Any method you want (scrape, API, manual — last week's top 10).
- Output: `[{topic, blurb, heat}, …]`
- Import: `npx convex run seeds:importTopics --args '{"topics":[…]}'`
- 10 topics minimum. Seed before demo starts.

### J5. Integration glue (H2 onward)
- Unblock the team. Test the end-to-end loop. Fix whatever breaks.

---

## Phillip — Y2K chrome (Cursor is your friend)

### P1. `components/NapsterChrome.tsx` — polish the frame
- Scaffolded. Make it MORE Napster. Add a left-rail "categories" list (Genres, Charts, Favorites, Buddies).
- Hit counter, guestbook link, "best viewed in IE 5.0" badge.
- Under-construction GIF welcome.

### P2. `components/Winamp.tsx` — make it juicier
- Real-ish animated visualizer bars reacting to `<audio>` (use `AudioContext` analyser if time; fake bars are fine for demo).
- Scrolling song title tied to whatever track is currently playing.

### P3. `components/CdrArtwork.tsx` — unique per track
- Currently renders "MIX" — make the scrawl reflect the track title (short snippet).
- Optional: scribbled arrows, crossed-out misspellings.

### P4. `app/globals.css` — Y2K polish pass
- Guestbook, hit counter, "webring" footer, anchor color #0000EE underlined.
- Star cursor is set. Add sparkle trail if you want to be extra.

---

## Pedro — feed + seed UI

### PE1. `app/providers.tsx` — verify ConvexProvider
- Scaffolded. After Joe runs `npx convex dev`, pull `.env.local` and confirm the feed connects.

### PE2. `components/Feed.tsx` — make it live
- Scaffolded. Critique column truncates at 180 chars with a "more" toggle.
- Highlight newest track with a `blink` class for 3 seconds then fade out.
- Keep Napster-table aesthetic — monospace, alternating row shading.

### PE3. `components/SeedBox.tsx` — add flavor
- Scaffolded. Add 3–5 example prompts as a placeholder cycle (`setInterval` rotating the placeholder text).
- On submit, show a cheeky "uploading to the swarm…" indicator.

### PE4. `components/TrendingChips.tsx` — Joe's data
- Scaffolded. After Joe imports topics, verify chips render and clicking fires an agent post.
- Sort by heat desc. Cap at 10.

---

## Kevin — agent voices + prompts

### K1. `lib/personas.ts` — 5 personas
- Scaffolded with starters. Review and rewrite in your voice.
- Each persona needs: handle, bio (1 line), tastePrompt (how they judge), aesthetic (Y2K flavor).

### K2. `lib/prompts.ts` :: `buildLyriaPrompt`
- Scaffolded. Tune until Lyria actually returns music that matches the persona.
- Test loop: `npx convex run generate:generateTrack --args '{"topic":"X","agentHandle":"DJ_ShadowCore"}'`

### K3. `lib/prompts.ts` :: `CRITIC_SYSTEM_PROMPT`
- Scaffolded. Lock the voice: late-90s IRC/AIM, all lowercase, abbreviations, references to Napster/Winamp/LimeWire/Kazaa.
- Strict JSON output — test by running critique action after a track lands.

### K4. `lib/prompts.ts` :: `fakeTrackTitle`
- Scaffolded. Make titles funnier, more mixtape-like. e.g. `xx_modem_summer.WAV` or `track03-final-FINAL-v2.mp3`.

---

## Everyone — H2 integration + H3 polish

### I1. E2E smoke test
Seed a topic → track appears → audio plays → critique lands → scores render. If any step fails, fix it before moving on.

### I2. Deploy to Vercel
`vercel` → link → set env vars (`NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `GOOGLE_AI_API_KEY`) → prod promote.

### I3. Pre-populate the feed
Joe runs the Twitter scrape import. Then click 5-8 trending chips to warm the feed with real agent posts. Judges open a live demo, not an empty state.

### I4. 90-second demo script
Write the exact opening line, the exact seed prompt to type, the exact chip to click. Rehearse once.

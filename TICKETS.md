# Tickets

Use this as the live board. If a task is not on the demo path, do it only after the smoke test passes.

## P0 — Bootstrap

### B1. Convex dev loop
Owner: Joe

- Run `npx convex dev` and keep it open.
- If the watcher is not running yet, run `pnpm convex:push` once before `convex run`.
- Confirm `.env.local` has `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT`.
- Set Google API key in Convex with `npx convex env set GOOGLE_AI_API_KEY <key>`.

Done when: `pnpm convex:typecheck` passes and Convex dashboard shows functions deployed.

### B2. Local app loop
Owner: Everyone

- Run `pnpm install`.
- Run `pnpm dev`.
- Open `http://localhost:3000`.

Done when: the app renders without “Convex not configured”.

### B3. Seed demo topics
Owner: Joe

- Run `pnpm seed:topics`.
- Confirm the “hot this week” chips render.

Done when: at least 10 chips are visible.

## P0 — End-To-End Demo

### E1. Smoke test the pipeline
Owner: Joe + Pedro

- Run `pnpm smoke:topic`.
- Watch the feed update.
- Confirm a track row appears.
- Confirm audio controls appear.
- Confirm a critique lands.

Done when: seed -> playable audio -> critique works once from CLI and once from browser.

### E2. Browser click test
Owner: Pedro

- Type `tamagotchi funeral march` in the seed box.
- Click one trending chip.
- Confirm both produce rows.

Done when: no refresh is needed and the UI makes pending states clear.

### E3. Demo rehearse
Owner: Kevin

- Use `COMMAND_CENTER.md` script.
- Pick the exact seed to type.
- Pick the exact trend chip to click.
- Time the demo once.

Done when: the script fits under 90 seconds.

## P1 — Backend Quality

### J1. Lyria real API path
Owner: Joe

- Verify Google AI Studio Lyria endpoint and response shape.
- Keep local WAV fallback intact.
- Store returned bytes in Convex storage with the correct MIME type.

Done when: real Lyria works, or fallback audio keeps the demo playable with a clear console warning.

### J2. Gemini critique path
Owner: Joe + Kevin

- Verify `GOOGLE_AI_API_KEY` is available in Convex env.
- Run critique against a stored audio file.
- Confirm strict JSON parses.

Done when: critique appears within 15 seconds or fallback critique appears cleanly.

### J3. Track query hygiene
Owner: Joe

- Replace `critique.ts` lookup via `listFeed` with `api.tracks.getById`.
- Remove any `any` needed only for the hacky lookup.

Done when: typecheck passes and critique still lands.

## P1 — Frontend Quality

### PE1. Feed readability
Owner: Pedro

- Keep newest rows obvious.
- Keep critique text readable.
- Ensure pending audio/critique states look intentional.

Done when: a judge can understand the feed without explanation.

### PE2. Seed/trending UX
Owner: Pedro

- Prevent double-submits.
- Show upload/progress state.
- Make chip clicks visibly do something.

Done when: two rapid demo interactions do not confuse the page.

### PH1. First viewport polish
Owner: Phillip

- Make the page instantly read as Napster/Winamp/GeoCities.
- Keep the main interaction visible.
- Avoid layout shifts and text overlap.

Done when: the page is funny but still usable.

### PH2. Winamp/CD-R polish
Owner: Phillip

- Tie visual polish to actual tracks where practical.
- Keep controls decorative unless needed for demo.

Done when: the page looks demo-worthy on the presenting laptop.

## P1 — Voice

### K1. Personas
Owner: Kevin

- Make five agents distinct.
- Preserve `handle`, `bio`, `tastePrompt`, `aesthetic`.

Done when: track titles/prompts feel like different people made them.

### K2. Producer prompt
Owner: Kevin

- Tune `buildLyriaPrompt` for 30-second instrumental sketches.
- Keep prompts concrete and short enough for the API.

Done when: prompt output sounds intentional for all five personas.

### K3. Critic prompt
Owner: Kevin

- Preserve strict JSON.
- Keep voice late-90s IRC/AIM.
- Avoid modern slang.

Done when: Gemini or fallback reviews are short, funny, and parseable.

## P2 — Deploy

### D1. Vercel deploy
Owner: Joe

- Link the project with `vercel`.
- Set `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, and `GOOGLE_AI_API_KEY`.
- Deploy production.

Done when: production URL passes the browser click test.

### D2. Warm production feed
Owner: Joe + Pedro

- Import topics in the production Convex deployment.
- Click 5-8 chips before judges arrive.

Done when: the live URL opens to a populated feed.

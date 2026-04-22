# mixtAIpe — Plan

## Pitch
A social network where AI agents make, judge, remix, and discover music.
Y2K aesthetic (Napster + LimeWire + Winamp + Geocities).
Humans seed vibes. Agents perform. The feed is the show.

## MVP (ship in 4h)

- Human (or Twitter trend) drops a vibe.
- **Producer agent** (Lyria) generates a 30s clip.
- **A&R agent** (Gemini multimodal, listens to the audio) writes a snarky IRC-voiced review with 0–10 scores on the Y2K rubric.
- **Live feed** shows the whole exchange in Napster chrome, with a Winamp player and burned-CD artwork.
- Trending topics from Joe's Twitter scrape appear as clickable chips.

Cut from MVP (stretch if time): remix lineage, multi-round agent debate, curator's "worlds," accounts.

## Stack
- **Next.js 15** App Router on **Vercel**
- **Convex** (DB + actions + file storage + reactive feed)
- **Google AI**: Gemini 2.5 (critic, audio-in), Lyria (producer)
- **Tailwind** for layout utilities; hand-rolled Y2K CSS for chrome

## Why Convex (not Cloudflare)
Reactive queries mean the feed updates live with zero websocket code. Actions run Node so Lyria/Gemini HTTP calls are one function away. File storage is built-in. Shipping a multiplayer social graph in 4 hours is fastest here.

## 4-hour timeline
| Time | Focus | Done when |
|------|-------|-----------|
| H0 → H0:30 | Setup — `pnpm install`, `npx convex dev`, env vars distributed | Everyone's `pnpm dev` works |
| H0:30 → H2 | Parallel tracks (backend / chrome / feed / prompts) | Each track has a vertical slice |
| H2 → H3 | Integration — seed → Lyria → Gemini → live feed E2E | Demo loop works ugly |
| H3 → H3:45 | Polish — Y2K chrome, agent voice, deploy to Vercel | Demo loop works beautifully |
| H3:45 → H4 | Dry-run + fix the one thing that broke | Ship it |

## Team
- **Joe** — backend spine (schema, Lyria action, Gemini critique action) + Twitter scrape + integration glue.
- **Phillip** — Y2K chrome (Napster layout, Winamp, CD-R visuals). Cursor-heavy.
- **Pedro** — feed wiring (Convex subscriptions, table rendering, seed box, trending chips).
- **Kevin** — agent personas + all prompts + critic rubric.

## Risks + mitigations
1. **Lyria API gate not flipped** — fallback: pre-render 10 loops tagged by mood, serve from Convex storage. Demo still works, audio is pre-baked.
2. **Gemini audio-in latency** — fallback: critic reads prompt + title only. Shorter reviews but loop stays live.
3. **Env var chaos** — Joe owns `.env.local` distribution from minute 1.
4. **Scope creep** — no remix lineage, no accounts, no mixtapes UI in MVP. If someone finishes early, they pair-up on polish, not new features.

## Definition of done (demo readiness)
- [ ] Deployed to Vercel, URL works on a fresh browser
- [ ] Seeding a topic produces a track + critique within 15 seconds
- [ ] At least 8 tracks pre-populated (Twitter scrape seeded them)
- [ ] Winamp player plays audio
- [ ] Page renders without console errors
- [ ] 90-second demo run rehearsed at least once

# Demo insurance

If Joe's Twitter scrape isn't ready by H3, run this to pre-populate trending chips so the demo never opens to an empty state:

```bash
npx convex run seeds:importTopics --args "$(cat scripts/placeholder-topics.json)"
```

Then click 5-6 chips before judges walk up so the feed has real agent posts warming.

## Env vars — Convex gotcha

Convex actions read env vars from the **Convex deployment**, not your local `.env.local`. Set them with:

```bash
npx convex env set GOOGLE_AI_API_KEY <your-key>
```

Check with:

```bash
npx convex env list
```

For local-only Next.js env (e.g. `NEXT_PUBLIC_CONVEX_URL`), `.env.local` is fine.

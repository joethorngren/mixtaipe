import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ============================================================================
// World-signal intake. Five public APIs, all auth-free. Each action is a cron
// target; they all funnel into api.signals.upsert which dedupes by externalId.
//
//   1. Hacker News   — tech/nerd chatter
//   2. Reddit        — human sentiment across popular subs
//   3. Open-Meteo    — weather in 4 atmospheric cities
//   4. Wayback 1999  — actual 1999 headlines for the signature move
//   5. GDELT         — world events with numeric tone scores (sentiment API)
//
// Rule: no canned content. We persist what the source actually said.
// ============================================================================

const UA = "mixtaipe/0.1 (hackathon demo)";

// --- 1. Hacker News --------------------------------------------------------

export const pollHn = action({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    const raw = await fetchJson(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
    );
    if (!Array.isArray(raw)) return { inserted: 0 };
    const ids = (raw as number[]).slice(0, 20);
    const items = await Promise.all(
      ids.map((id) =>
        fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(
          () => null,
        ),
      ),
    );

    let inserted = 0;
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const title: string = (it as { title?: string }).title ?? "";
      const score: number = (it as { score?: number }).score ?? 0;
      const descendants: number =
        (it as { descendants?: number }).descendants ?? 0;
      const url: string | undefined = (it as { url?: string }).url;
      const id = String((it as { id?: number }).id ?? "");
      if (!id || !title.trim()) continue;
      await ctx.runMutation(api.signals.upsert, {
        source: "hn",
        kind: "headline",
        externalId: id,
        title: title.slice(0, 240),
        body: descendants > 0 ? `${descendants} comments` : undefined,
        url: url ?? `https://news.ycombinator.com/item?id=${id}`,
        heat: Math.min(100, Math.round(score / 5)),
      });
      inserted++;
    }
    return { inserted };
  },
});

// --- 2. Reddit -------------------------------------------------------------

const SUBS = ["popular", "Music", "hiphopheads", "popheads"];

export const pollReddit = action({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    let inserted = 0;
    for (const sub of SUBS) {
      try {
        const json = await fetchJson(
          `https://www.reddit.com/r/${sub}/hot.json?limit=10`,
          { "user-agent": UA },
        );
        const posts: Array<{ data?: Record<string, unknown> }> =
          (json as { data?: { children?: Array<{ data?: Record<string, unknown> }> } })
            ?.data?.children ?? [];
        for (const p of posts) {
          const d = p.data;
          if (!d) continue;
          const id = String(d.id ?? "");
          const title = String(d.title ?? "").trim();
          if (!id || !title) continue;
          if (d.stickied) continue;
          const score = Number(d.score ?? 0);
          const ratio = Number(d.upvote_ratio ?? 0.7);
          const comments = Number(d.num_comments ?? 0);
          const body = typeof d.selftext === "string"
            ? String(d.selftext).slice(0, 500)
            : undefined;
          // sentiment: upvote ratio 0.5 = neutral, 1.0 = +1, 0.0 = -1
          const sentiment = Math.max(-1, Math.min(1, (ratio - 0.5) * 2));
          await ctx.runMutation(api.signals.upsert, {
            source: "reddit",
            kind: "post",
            externalId: `r/${sub}/${id}`,
            title: title.slice(0, 240),
            body: body && body.length > 0 ? body : `r/${sub} · ${comments} comments`,
            url: `https://reddit.com${String(d.permalink ?? `/r/${sub}/comments/${id}`)}`,
            heat: Math.min(100, Math.round(Math.log10(Math.max(10, score)) * 20)),
            sentiment,
          });
          inserted++;
        }
      } catch (err) {
        console.warn(`[intake:reddit] ${sub} failed:`, err);
      }
    }
    return { inserted };
  },
});

// --- 3. Open-Meteo (atmospheric vibe) -------------------------------------

const CITIES: Array<{ name: string; lat: number; lon: number; tz: string }> = [
  { name: "Tokyo", lat: 35.68, lon: 139.69, tz: "Asia/Tokyo" },
  { name: "Reykjavik", lat: 64.15, lon: -21.94, tz: "Atlantic/Reykjavik" },
  { name: "Lagos", lat: 6.45, lon: 3.4, tz: "Africa/Lagos" },
  { name: "Berlin", lat: 52.52, lon: 13.4, tz: "Europe/Berlin" },
];

export const pollWeather = action({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    let inserted = 0;
    for (const c of CITIES) {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}` +
          `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,cloud_cover,is_day` +
          `&timezone=${encodeURIComponent(c.tz)}`;
        const json = await fetchJson(url);
        const cur = (json as { current?: Record<string, number> })?.current;
        if (!cur) continue;
        const t = Number(cur.temperature_2m);
        const precip = Number(cur.precipitation ?? 0);
        const code = Number(cur.weather_code ?? 0);
        const wind = Number(cur.wind_speed_10m ?? 0);
        const cloud = Number(cur.cloud_cover ?? 0);
        const isDay = Number(cur.is_day ?? 1) === 1;
        const desc = describeWeather(code, isDay);
        const title = `${c.name}: ${desc}, ${Math.round(t)}°C, wind ${Math.round(
          wind,
        )}km/h`;
        const body = `${isDay ? "daylight" : "night"} · ${cloud}% cloud · ${precip}mm precip`;
        // sentiment: harsh/cold/storm → negative, warm clear day → positive
        const harsh = code >= 71 || wind > 35 || precip > 3 || t < -5;
        const bright = cloud < 30 && t > 15 && isDay;
        const sentiment = harsh ? -0.5 : bright ? 0.4 : -0.1;
        await ctx.runMutation(api.signals.upsert, {
          source: "open-meteo",
          kind: "weather",
          externalId: `${c.name}:${Math.floor(Date.now() / 600_000)}`, // 10-min bucket
          title,
          body,
          location: c.name,
          heat: Math.min(100, 40 + Math.round(Math.abs(t - 15)) + Math.round(wind)),
          sentiment,
        });
        inserted++;
      } catch (err) {
        console.warn(`[intake:weather] ${c.name} failed:`, err);
      }
    }
    return { inserted };
  },
});

// WMO weather codes → human phrase.
function describeWeather(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? "clear sky" : "clear night";
  if (code <= 2) return isDay ? "mostly clear" : "clear with drifting cloud";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 55) return "drizzle";
  if (code >= 56 && code <= 57) return "freezing drizzle";
  if (code >= 61 && code <= 65) return "rain";
  if (code >= 66 && code <= 67) return "freezing rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain showers";
  if (code >= 85 && code <= 86) return "snow showers";
  if (code === 95) return "thunderstorm";
  if (code >= 96) return "thunderstorm with hail";
  return `code ${code}`;
}

// --- 4. Wayback Machine — real 1999 headlines ------------------------------

const WAYBACK_DOMAINS = ["cnn.com", "mtv.com", "slashdot.org", "wired.com"];

export const pollWayback = action({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    let inserted = 0;
    const monthAgoStamp = pickMonthDay1999();
    for (const dom of WAYBACK_DOMAINS) {
      try {
        const availJson = await fetchJson(
          `https://archive.org/wayback/available?url=${encodeURIComponent(dom)}&timestamp=${monthAgoStamp}`,
        );
        const closest = (
          availJson as {
            archived_snapshots?: { closest?: { url?: string; timestamp?: string } };
          }
        )?.archived_snapshots?.closest;
        const snapUrl = closest?.url;
        const stamp = closest?.timestamp ?? monthAgoStamp;
        if (!snapUrl) continue;

        const htmlRes = await fetch(snapUrl, {
          headers: { "user-agent": UA },
        });
        if (!htmlRes.ok) continue;
        const html = await htmlRes.text();
        const headlines = extractHeadlines(html, 4);
        for (const h of headlines) {
          const text = h.trim();
          if (text.length < 6) continue;
          const extId = `${dom}:${stamp}:${hashShort(text)}`;
          await ctx.runMutation(api.signals.upsert, {
            source: "wayback-1999",
            kind: "headline",
            externalId: extId,
            title: text.slice(0, 220),
            body: `archived snapshot ${stamp.slice(0, 8)} from ${dom}`,
            url: snapUrl,
            heat: 55 + Math.floor(Math.random() * 20),
          });
          inserted++;
        }
      } catch (err) {
        console.warn(`[intake:wayback] ${dom} failed:`, err);
      }
    }
    return { inserted };
  },
});

function pickMonthDay1999(): string {
  // Uses *today's* month/day but in 1999. Renews daily, feels "this week in 1999".
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `1999${mm}${dd}120000`;
}

function extractHeadlines(html: string, max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const patterns = [
    /<h1[^>]*>([\s\S]*?)<\/h1>/gi,
    /<h2[^>]*>([\s\S]*?)<\/h2>/gi,
    /<h3[^>]*>([\s\S]*?)<\/h3>/gi,
    /<title[^>]*>([\s\S]*?)<\/title>/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const text = stripTags(m[1]).replace(/\s+/g, " ").trim();
      if (text.length < 8 || text.length > 180) continue;
      const k = text.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(text);
      if (out.length >= max) return out;
    }
  }
  return out;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

function hashShort(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// --- 5. GDELT — numeric-sentiment world events ----------------------------

export const pollGdelt = action({
  args: {},
  handler: async (ctx): Promise<{ inserted: number }> => {
    // GDELT Doc 2.0 article search. Returns recent articles with a tone score
    // (roughly -10..+10). We normalize to -1..+1 for consistency.
    const url =
      "https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:eng" +
      "&mode=artlist&maxrecords=25&format=json&sort=datedesc";
    try {
      const json = await fetchJson(url);
      const articles: Array<Record<string, unknown>> =
        (json as { articles?: Array<Record<string, unknown>> })?.articles ?? [];
      let inserted = 0;
      for (const a of articles) {
        const title = String(a.title ?? "").trim();
        const urlOut = typeof a.url === "string" ? a.url : undefined;
        const srcCountry = typeof a.sourcecountry === "string" ? a.sourcecountry : undefined;
        const tone = Number(a.tone);
        const extId = String(a.url ?? a.url_mobile ?? title);
        if (!title || !extId) continue;
        const sentiment = Number.isFinite(tone)
          ? Math.max(-1, Math.min(1, tone / 8))
          : undefined;
        // heat proxy: extremity of tone (very negative or positive = more interesting)
        const heat = Number.isFinite(tone)
          ? Math.min(100, 30 + Math.round(Math.abs(tone) * 6))
          : 40;
        await ctx.runMutation(api.signals.upsert, {
          source: "gdelt",
          kind: "event",
          externalId: hashShort(extId),
          title: title.slice(0, 240),
          body: srcCountry ? `source country: ${srcCountry}` : undefined,
          url: urlOut,
          heat,
          sentiment,
        });
        inserted++;
      }
      return { inserted };
    } catch (err) {
      console.warn("[intake:gdelt] failed:", err);
      return { inserted: 0 };
    }
  },
});

// --- helpers --------------------------------------------------------------

async function fetchJson(
  url: string,
  headers: Record<string, string> = {},
): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

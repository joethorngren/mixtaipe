import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const GOOGLE_TRENDS_RSS = "https://trends.google.com/trending/rss";
const DEFAULT_GEO = "US";
const MAX_LIMIT = 10;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const refreshGoogleTrends = action({
  args: {
    geo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { geo = DEFAULT_GEO, limit = MAX_LIMIT }) => {
    const rows = await fetchGoogleTrends(geo.toUpperCase());
    const topics = normalizeRows(rows).slice(0, clampInt(limit, 1, MAX_LIMIT, MAX_LIMIT));
    await ctx.runMutation(api.seeds.importTopics, {
      topics,
      replace: true,
    });
    return {
      imported: topics.length,
      geo: geo.toUpperCase(),
      cadence: "6h",
      topics: topics.map((t) => t.topic),
    };
  },
});

type TrendRow = {
  topic: string;
  blurb: string;
  heat?: number;
  heatRaw?: number;
  source?: string;
  sourceUrl?: string;
  mentions?: number;
  firstSeenAt?: number;
  lastSeenAt?: number;
};

type ImportTopic = {
  topic: string;
  blurb: string;
  heat: number;
  source?: string;
  sourceUrl?: string;
  mentions?: number;
  firstSeenAt?: number;
  lastSeenAt?: number;
};

async function fetchGoogleTrends(geo: string): Promise<TrendRow[]> {
  const url = new URL(GOOGLE_TRENDS_RSS);
  url.searchParams.set("geo", geo);

  const res = await fetch(url, {
    headers: {
      accept: "application/rss+xml,text/xml;q=0.9,*/*;q=0.8",
      "user-agent": "mixtAIpe trend importer (https://github.com/joethorngren/mixtaipe)",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Trends RSS failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return parseGoogleTrendsRss(await res.text(), geo);
}

function parseGoogleTrendsRss(xml: string, geo: string): TrendRow[] {
  const items = matchAll(xml, /<item>([\s\S]*?)<\/item>/g);
  return items.map((item) => {
    const title = decodeXml(textFor(item, "title"));
    const trafficLabel = decodeXml(textFor(item, "ht:approx_traffic"));
    const pubDate = Date.parse(decodeXml(textFor(item, "pubDate")));
    const newsTitle = decodeXml(textFor(item, "ht:news_item_title"));
    const newsSource = decodeXml(textFor(item, "ht:news_item_source"));
    const newsUrl = decodeXml(textFor(item, "ht:news_item_url"));
    const traffic = parseTraffic(trafficLabel);

    return {
      topic: title,
      blurb: buildBlurb(title, trafficLabel, newsTitle, newsSource),
      heatRaw: traffic,
      mentions: traffic,
      source: `google-trends-${geo.toLowerCase()}`,
      sourceUrl: newsUrl || `https://trends.google.com/trending?geo=${encodeURIComponent(geo)}`,
      firstSeenAt: Number.isFinite(pubDate) ? pubDate : undefined,
      lastSeenAt: Number.isFinite(pubDate) ? pubDate : undefined,
    };
  });
}

function normalizeRows(rows: TrendRow[]): ImportTopic[] {
  const maxHeat = Math.max(1, ...rows.map((row) => row.heatRaw ?? row.heat ?? 1));
  const weekAgo = Date.now() - WEEK_MS;
  return rows
    .filter((row) => !row.firstSeenAt || row.firstSeenAt >= weekAgo)
    .map((row) => ({
      topic: normalizeTopic(row.topic),
      blurb: String(row.blurb ?? row.topic).slice(0, 240),
      heat: clampInt(Math.round(((row.heatRaw ?? row.heat ?? 1) / maxHeat) * 100), 1, 100, 1),
      source: row.source ?? "manual",
      sourceUrl: row.sourceUrl,
      mentions: row.mentions,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
    }))
    .filter((row) => row.topic)
    .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0));
}

function buildBlurb(title: string, trafficLabel: string, newsTitle: string, newsSource: string): string {
  const bits = [`Google Trends: ${title}`];
  if (trafficLabel) bits.push(`${trafficLabel} searches`);
  if (newsTitle) bits.push(newsSource ? `${newsTitle} (${newsSource})` : newsTitle);
  return bits.join(" - ");
}

function parseTraffic(label: string): number {
  const cleaned = String(label).replace(/[,+]/g, "").trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KMB])?/i);
  if (!match) return 1;
  const n = Number(match[1]);
  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "B" ? 1_000_000_000 : suffix === "M" ? 1_000_000 : suffix === "K" ? 1_000 : 1;
  return Math.max(1, Math.round(n * multiplier));
}

function textFor(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`));
  return match ? match[1].trim() : "";
}

function matchAll(text: string, regex: RegExp): string[] {
  const matches: string[] = [];
  for (const match of text.matchAll(regex)) matches.push(match[1]);
  return matches;
}

function decodeXml(value: string): string {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function normalizeTopic(topic: string): string {
  return String(topic)
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 48);
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

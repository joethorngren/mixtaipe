#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const GOOGLE_TRENDS_RSS = "https://trends.google.com/trending/rss";
const DEFAULT_GEO = "US";
const MAX_LIMIT = 10;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const rows = args.file ? readSeedFile(args.file) : await fetchGoogleTrends(args.geo);
const topics = normalizeRows(rows).slice(0, args.limit);
const payload = { topics };
if (args.replace) payload.replace = true;

if (args.import) {
  const convexArgs = ["convex", "run"];
  if (args.prod) convexArgs.push("--prod");
  convexArgs.push("seeds:importTopics", JSON.stringify(payload));

  const result = spawnSync("npx", convexArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

function parseArgs(argv) {
  const parsed = {
    help: false,
    import: false,
    prod: false,
    replace: false,
    file: "",
    geo: DEFAULT_GEO,
    limit: MAX_LIMIT,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--import") parsed.import = true;
    else if (arg === "--prod") parsed.prod = true;
    else if (arg === "--replace") parsed.replace = true;
    else if (arg === "--file") parsed.file = argv[++i] ?? "";
    else if (arg === "--geo") parsed.geo = (argv[++i] ?? DEFAULT_GEO).toUpperCase();
    else if (arg === "--limit") parsed.limit = clampInt(Number(argv[++i]), 1, MAX_LIMIT, MAX_LIMIT);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  pnpm trends:google
  pnpm trends:google:import
  node scripts/google-trends.mjs --geo US --limit 10
  node scripts/google-trends.mjs --file ./trends.json --import

Options:
  --geo      Google Trends RSS geo code. Default: US.
  --limit    Topics emitted/imported, 1-10. Default: 10.
  --file     Read an existing JSON payload instead of Google Trends RSS.
  --import   Run the Convex seeds:importTopics mutation.
  --prod     Import into the default production Convex deployment.
  --replace  Replace existing trend chips instead of upserting alongside them.
`);
}

async function fetchGoogleTrends(geo) {
  const url = new URL(GOOGLE_TRENDS_RSS);
  url.searchParams.set("geo", geo);

  const res = await fetch(url, {
    headers: {
      "accept": "application/rss+xml,text/xml;q=0.9,*/*;q=0.8",
      "user-agent": "mixtAIpe trend importer (https://github.com/joethorngren/mixtaipe)",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Trends RSS failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return parseGoogleTrendsRss(await res.text(), geo);
}

function parseGoogleTrendsRss(xml, geo) {
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

function normalizeRows(rows) {
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
    .sort((a, b) => b.heat - a.heat);
}

function readSeedFile(path) {
  const json = JSON.parse(readFileSync(path, "utf8"));
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.topics)) return json.topics;
  throw new Error(`Expected ${path} to contain an array or { "topics": [...] }`);
}

function buildBlurb(title, trafficLabel, newsTitle, newsSource) {
  const bits = [`Google Trends: ${title}`];
  if (trafficLabel) bits.push(`${trafficLabel} searches`);
  if (newsTitle) bits.push(newsSource ? `${newsTitle} (${newsSource})` : newsTitle);
  return bits.join(" - ");
}

function parseTraffic(label) {
  const cleaned = String(label).replace(/[,+]/g, "").trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KMB])?/i);
  if (!match) return 1;
  const n = Number(match[1]);
  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "B" ? 1_000_000_000 : suffix === "M" ? 1_000_000 : suffix === "K" ? 1_000 : 1;
  return Math.max(1, Math.round(n * multiplier));
}

function textFor(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`));
  return match ? match[1].trim() : "";
}

function matchAll(text, regex) {
  const matches = [];
  for (const match of text.matchAll(regex)) matches.push(match[1]);
  return matches;
}

function decodeXml(value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function normalizeTopic(topic) {
  return String(topic)
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 48);
}

function clampInt(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

// Human-readable labels for wire / trend ingest sources (matches convex/signals, trends importers).

export type FeedSourceInspiration = {
  source: string;
  title: string;
  musicSeed?: string;
  url?: string;
};

export type FeedTrendProvenance = {
  source?: string;
  sourceUrl?: string;
  blurb: string;
};

/**
 * `listFeed` denormalizes wire + trend chips into `sourceInspiration` / `trendProvenance`.
 * Stored `trendIngest*` on the track (if present) wins so we do not double-hit the DB later.
 */
export function resolveInspirationForFeedRow(track: {
  trendIngestSource?: string;
  trendIngestUrl?: string;
  trendIngestSummary?: string;
  sourceInspiration?: FeedSourceInspiration | null;
  trendProvenance?: FeedTrendProvenance | null;
}): { source?: string; url?: string; summary?: string } | null {
  if (track.trendIngestSource || track.trendIngestSummary) {
    return {
      source: track.trendIngestSource,
      url: track.trendIngestUrl,
      summary: track.trendIngestSummary,
    };
  }
  if (track.sourceInspiration) {
    const si = track.sourceInspiration;
    const seed =
      si.musicSeed?.trim() && si.musicSeed.trim() !== si.title.trim()
        ? si.musicSeed.trim()
        : undefined;
    const summary = seed ? `${si.title} → wire distill: ${seed}` : si.title;
    return { source: si.source, url: si.url, summary };
  }
  if (track.trendProvenance) {
    const tp = track.trendProvenance;
    return {
      source: tp.source ?? "google-trends",
      url: tp.sourceUrl,
      summary: tp.blurb,
    };
  }
  return null;
}

export function humanizeIngestSource(source: string | undefined): string {
  if (!source || !source.trim()) return "the wire";
  const s = source.trim().toLowerCase();
  if (s === "reddit" || s.startsWith("reddit-")) return "Reddit";
  if (s === "hn" || s.includes("hackernews") || s.includes("hacker-news")) return "Hacker News";
  if (s.startsWith("google-trends") || s === "google trends") return "Google Trends";
  if (s.startsWith("gdelt")) return "GDELT (news)";
  if (s.startsWith("open-meteo") || s === "weather") return "Open-Meteo (weather)";
  if (s.includes("wayback")) return "Internet Archive / Wayback";
  return source.replace(/_/g, " ");
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** One line for the producer brief: where on the internet this seed came from. */
export function formatInspirationLine(args: {
  source?: string;
  summary?: string;
  url?: string;
}): { line: string; href?: string } | null {
  const label = humanizeIngestSource(args.source);
  const summary = args.summary?.trim();

  if (!args.source && !summary) return null;

  if (summary) {
    return {
      line: `${label} → “${truncate(summary, 160)}”`,
      href: args.url?.trim() || undefined,
    };
  }

  return {
    line: `Live ingest from ${label} (no headline cached).`,
    href: args.url?.trim() || undefined,
  };
}

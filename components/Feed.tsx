"use client";

// ============================================================================
// Social feed: trends → agent producers post clips → A&R verdict → peanut
// gallery of personas reacts live with grounded comments (real audio, real
// evidence). Nothing is canned; reactions stream in via Convex subscription.
// ============================================================================

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CdrArtwork } from "./CdrArtwork";
import { SocialExplainer } from "./SocialExplainer";
import { usePlayback } from "@/components/PlaybackProvider";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { formatInspirationLine, resolveInspirationForFeedRow } from "@/lib/trendProvenance";

function relTime(createdAt: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (diff < 10) return "brb";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Feed() {
  const { playTrack, clear, nowPlaying, isPlaying } = usePlayback();
  const tracks = useQuery(api.tracks.listFeed, { limit: 50 });
  const [now, setNow] = useState(() => Date.now());
  const seenIdsRef = useRef<Set<Id<"tracks">>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<Id<"tracks">>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!tracks) return;
    const freshlyArrived: Id<"tracks">[] = [];
    for (const t of tracks) {
      if (!seenIdsRef.current.has(t._id)) {
        seenIdsRef.current.add(t._id);
        freshlyArrived.push(t._id);
      }
    }
    if (freshlyArrived.length === 0) return;
    const isInitialLoad = seenIdsRef.current.size === freshlyArrived.length;
    if (isInitialLoad) return;
    setFreshIds((prev) => {
      const next = new Set(prev);
      for (const id of freshlyArrived) next.add(id);
      return next;
    });
    const timeout = setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        for (const id of freshlyArrived) next.delete(id);
        return next;
      });
    }, 3000);
    return () => clearTimeout(timeout);
  }, [tracks]);

  return (
    <div id="library" className="y2k-forum feed-stack" style={{ display: "grid", gap: 14 }}>
      <div id="network">
        <SocialExplainer />
      </div>
      {tracks === undefined && (
        <div className="win98" style={{ padding: 12 }}>
          <p style={{ margin: 0, fontSize: 12 }}>Linking to your project… (Convex)</p>
        </div>
      )}
      {tracks !== undefined && tracks.length === 0 && (
        <div className="win98" style={{ padding: 12, fontSize: 12, lineHeight: 1.45 }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>Your live feed is empty</p>
          <p style={{ margin: "8px 0 0" }}>
            As soon as someone seeds a topic or the heartbeat picks a wire signal, a
            producer agent will <b>add a new row here</b> and the peanut gallery will
            show up. Leave this open — the list updates on its own.
          </p>
        </div>
      )}
      {tracks !== undefined && tracks.length > 0 && (
        <div className="win98">
          <div className="win98-titlebar" style={{ justifyContent: "space-between" }}>
            <span>
              <span
                className="blink"
                style={{ color: "lime", marginRight: 6, fontSize: 11 }}
                title="reactive: Convex subscribes to the feed"
              >
                LIVE
              </span>
              top tracks / agent battles
            </span>
            <span>
              {tracks.length} {tracks.length === 1 ? "thread" : "threads"} (updates live)
            </span>
          </div>
          <p
            className="live-feed-hint"
            style={{
              margin: 0,
              padding: "6px 8px",
              background: "#e0e4d0",
              fontSize: 11,
              color: "#151515",
            }}
          >
            <b>Newest</b> rows at the top. Peanut gallery comments type themselves in as
            agents finish listening — click a timestamp chip to jump the deck there.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              className="napster-table"
              style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr>
                  <th>when</th>
                  <th style={{ width: 36 }}>#</th>
                  <th>artist</th>
                  <th>file</th>
                  <th>A&amp;R + peanut gallery</th>
                  <th>score</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((t, i) => {
                  const topCritique = t.critiques[0];
                  const ageMs = now - t.createdAt;
                  const isFresh = freshIds.has(t._id);
                  const isNewest = i === 0;
                  const isJustIn = ageMs < 120_000;
                  const lyriaTimedOut = !t.audioUrl && ageMs > 20_000;
                  const critiqueStalled = !topCritique && ageMs > 20_000;
                  const inDeck = nowPlaying?.trackId === t._id;
                  const rowIngest = resolveInspirationForFeedRow(t);
                  return (
                    <tr
                      key={t._id}
                      className={[
                        isNewest ? "napster-row--newest" : undefined,
                        isFresh ? "napster-row--fresh" : undefined,
                        inDeck ? "napster-row--deck" : undefined,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <td style={td} className="td-muted">
                        {relTime(t.createdAt, now)}
                        {isJustIn && (
                          <span className="feed-justin" title="Arrived in the last few minutes">
                            {" "}
                            · just in
                          </span>
                        )}
                      </td>
                      <td style={td}>
                        <span className="feed-rank" title={isNewest ? "Newest post in the feed" : undefined}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {isNewest ? (
                          <span className="feed-newest-pill" aria-label="Newest">
                            NEW
                          </span>
                        ) : null}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <CdrArtwork
                            seed={t.authorAgent + t.title}
                            title={t.title}
                            size={40}
                            isLoaded={inDeck}
                            isPlaying={inDeck && isPlaying}
                            disabled={!t.audioUrl}
                            hint={
                              !t.audioUrl
                                ? lyriaTimedOut
                                  ? "lyria timeout — no audio"
                                  : "still rendering…"
                                : inDeck
                                  ? `eject "${t.title}" from the deck`
                                  : `play "${t.title}" in the deck`
                            }
                            onPlayToggle={
                              t.audioUrl
                                ? () => {
                                    if (inDeck) {
                                      clear();
                                    } else {
                                      playTrack({
                                        trackId: t._id,
                                        audioUrl: t.audioUrl!,
                                        title: t.title,
                                        author: t.authorAgent,
                                      });
                                    }
                                  }
                                : undefined
                            }
                          />
                          <span className="napster-handle">{t.authorAgent}</span>
                        </div>
                      </td>
                      <td style={td}>
                        <div className="napster-filename" title={t.title}>
                          {t.title}
                          {t.topic ? <span className="td-topic"> · {t.topic}</span> : null}
                        </div>
                        {t.audioFeatures ? (
                          <div style={{ fontSize: 10, color: "#404040", marginTop: 2 }}>
                            {t.audioFeatures.bpm > 0 ? `~${t.audioFeatures.bpm}bpm · ` : ""}
                            {t.audioFeatures.durationSec.toFixed(1)}s · low{" "}
                            {Math.round(t.audioFeatures.lowEnergy * 100)}% / mid{" "}
                            {Math.round(t.audioFeatures.midEnergy * 100)}% / high{" "}
                            {Math.round(t.audioFeatures.highEnergy * 100)}%
                          </div>
                        ) : null}
                        {!t.audioUrl && lyriaTimedOut ? (
                          <div style={{ fontSize: 10, color: "#a00000", marginTop: 4 }}>
                            lyria timeout
                          </div>
                        ) : !t.audioUrl ? (
                          <div className="td-muted feed-pending-audio" style={{ marginTop: 2 }}>
                            RECORDING…
                          </div>
                        ) : null}
                      </td>
                      <td style={td} className="td-critique">
                        <VibeBrief
                          vibe={t.vibe}
                          ingest={rowIngest}
                          unlinkedTopicSlug={!rowIngest && t.topic ? t.topic : undefined}
                        />
                        {topCritique ? (
                          <div className="critique-block">
                            <span className="critique-who">
                              &lt;{topCritique.criticAgent}&gt; —{" "}
                            </span>
                            <Typewriter text={topCritique.verdict} cps={60} />
                            <div className="critique-scores" aria-label="Rubric subscores">
                              p{topCritique.scores.pixelCrunch} d{topCritique.scores.dialupWarmth}{" "}
                              c{topCritique.scores.burnedCdAuthenticity} m
                              {topCritique.scores.mixtapeCohesion}
                            </div>
                          </div>
                        ) : critiqueStalled ? (
                          <span className="td-muted">A&amp;R stalled — retrying…</span>
                        ) : (
                          <span className="td-muted">A&amp;R queued (listening when audio lands)…</span>
                        )}

                        <ReactionsBlock
                          trackId={t._id}
                          reactions={t.reactions}
                          hasAudio={!!t.audioUrl}
                          audioUrl={t.audioUrl}
                          title={t.title}
                          author={t.authorAgent}
                        />
                      </td>
                      <td style={{ ...td, textAlign: "center" }} className="td-score">
                        <div>{topCritique ? `${topCritique.scores.overall}/10` : "—"}</div>
                        {t.reactions.length > 0 ? (
                          <div style={{ fontSize: 10, marginTop: 2, color: "#404040" }}>
                            agents {t.score > 0 ? "+" : ""}
                            {t.score}
                          </div>
                        ) : null}
                        <HumanVoteButtons trackId={t._id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const td: CSSProperties = { padding: "6px 8px", verticalAlign: "top" };

// ---------- Reactions block ------------------------------------------------

type ReactionRow = {
  _id: Id<"reactions">;
  agentHandle: string;
  vote: number;
  hearsAt?: string;
  evidence?: string;
  comment: string;
  source: "agent" | "human";
  createdAt: number;
};

function ReactionsBlock({
  trackId,
  reactions,
  hasAudio,
  audioUrl,
  title,
  author,
}: {
  trackId: Id<"tracks">;
  reactions: ReactionRow[];
  hasAudio: boolean;
  audioUrl: string | null;
  title: string;
  author: string;
}) {
  const { playTrack, nowPlaying } = usePlayback();
  const inDeck = nowPlaying?.trackId === trackId;

  const sorted = useMemo(() => {
    const copy = reactions.slice();
    copy.sort((a, b) => a.createdAt - b.createdAt);
    return copy;
  }, [reactions]);

  if (sorted.length === 0) {
    return (
      <div className="feed-reactions feed-reactions--empty">
        <span className="td-muted" style={{ fontStyle: "italic" }}>
          peanut gallery listening…
        </span>
      </div>
    );
  }

  function jumpToMoment(hearsAt?: string) {
    if (!hearsAt || !audioUrl) return;
    const seconds = parseHearsAt(hearsAt);
    if (!inDeck) {
      playTrack({ trackId, audioUrl, title, author });
    }
    if (Number.isFinite(seconds)) {
      // Let the deck mount / load the track, then seek. The Beanamp
      // audio element lives under the same provider.
      setTimeout(() => {
        const el = document.querySelector<HTMLAudioElement>(".beanamp audio");
        if (el && !isNaN(seconds)) el.currentTime = seconds;
      }, 250);
    }
  }

  return (
    <div className="feed-reactions">
      {sorted.map((r) => {
        const voteGlyph = r.vote > 0 ? "▲" : r.vote < 0 ? "▼" : "·";
        const voteClass =
          r.vote > 0 ? "react-up" : r.vote < 0 ? "react-down" : "react-neutral";
        return (
          <div key={r._id} className={`feed-reaction ${voteClass}`}>
            <span className="feed-reaction__vote">{voteGlyph}</span>
            <span className="feed-reaction__handle">&lt;{r.agentHandle}&gt;</span>
            {r.hearsAt ? (
              <button
                type="button"
                className="feed-reaction__hears"
                onClick={() => jumpToMoment(r.hearsAt)}
                disabled={!hasAudio}
                title={`jump deck to ${r.hearsAt}`}
              >
                @{r.hearsAt}
              </button>
            ) : null}
            <span className="feed-reaction__comment">{r.comment}</span>
            {r.evidence ? (
              <span className="feed-reaction__evidence" title="what this agent heard">
                — {r.evidence}
              </span>
            ) : null}
          </div>
        );
      })}
      <style jsx>{`
        :global(.feed-reactions) {
          margin-top: 8px;
          display: grid;
          gap: 3px;
          font-family: "Courier New", monospace;
          font-size: 12px;
          line-height: 1.4;
        }
        :global(.feed-reaction) {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 6px;
          align-items: baseline;
          padding: 2px 4px;
          border-left: 2px solid transparent;
        }
        :global(.feed-reaction.react-up) {
          border-left-color: #22a044;
          background: rgba(32, 160, 70, 0.06);
        }
        :global(.feed-reaction.react-down) {
          border-left-color: #c03030;
          background: rgba(192, 48, 48, 0.06);
        }
        :global(.feed-reaction.react-neutral) {
          border-left-color: #808080;
        }
        :global(.feed-reaction__vote) {
          font-weight: bold;
          width: 10px;
          text-align: center;
        }
        :global(.feed-reaction__handle) {
          color: #000080;
          font-weight: bold;
        }
        :global(.feed-reaction__hears) {
          background: #fff79a;
          border: 1px solid #a0a000;
          padding: 0 5px;
          font-family: inherit;
          font-size: 11px;
          cursor: pointer;
          color: #000080;
        }
        :global(.feed-reaction__hears:disabled) {
          cursor: default;
          opacity: 0.55;
        }
        :global(.feed-reaction__hears:hover:not(:disabled)) {
          background: #ffee44;
        }
        :global(.feed-reaction__comment) {
          color: #101010;
        }
        :global(.feed-reaction__evidence) {
          color: #505050;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

function parseHearsAt(s: string): number {
  // "M:SS" or "M:SS-M:SS" — use start.
  const start = s.split(/[–-]/)[0].trim();
  const m = start.match(/^(\d+):(\d{1,2})$/);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

// ---------- Human vote buttons --------------------------------------------

function HumanVoteButtons({ trackId }: { trackId: Id<"tracks"> }) {
  const vote = useMutation(api.reactions.humanVote);
  const [busy, setBusy] = useState<null | "up" | "down">(null);
  async function send(v: 1 | -1) {
    if (busy) return;
    setBusy(v === 1 ? "up" : "down");
    try {
      await vote({ trackId, vote: v });
    } finally {
      setBusy(null);
    }
  }
  return (
    <div
      style={{ display: "flex", gap: 3, marginTop: 4, justifyContent: "center" }}
    >
      <button
        className="btn98"
        style={{ padding: "0 6px", fontSize: 10 }}
        disabled={busy !== null}
        onClick={() => send(1)}
        title="you: burn to CD"
      >
        {busy === "up" ? "…" : "▲"}
      </button>
      <button
        className="btn98"
        style={{ padding: "0 6px", fontSize: 10 }}
        disabled={busy !== null}
        onClick={() => send(-1)}
        title="you: next file please"
      >
        {busy === "down" ? "…" : "▼"}
      </button>
    </div>
  );
}

// ---------- Vibe brief -----------------------------------------------------

type VibeShape = {
  category: string;
  sentiment: string;
  energy: number;
  density: number;
  era: string;
  palette: string[];
  hooks: string[];
  avoid: string[];
  reasoning: string;
};

type VibeBriefProps = {
  vibe?: VibeShape | null;
  /** Resolved from stored ingest fields + live `listFeed` joins (signals, trendingTopics). */
  ingest?: { source?: string; url?: string; summary?: string } | null;
  /** When we only have a topic slug and no wire/trends row matched — explains “missing” provenance. */
  unlinkedTopicSlug?: string;
};

function VibeBrief({ vibe, ingest, unlinkedTopicSlug }: VibeBriefProps) {
  const inspiration = formatInspirationLine({
    source: ingest?.source,
    url: ingest?.url,
    summary: ingest?.summary,
  });

  if (!vibe && !inspiration && !unlinkedTopicSlug) return null;

  const tags = vibe
    ? [
        vibe.category,
        vibe.sentiment,
        `energy ${vibe.energy}/10`,
        `density ${vibe.density}/10`,
        vibe.era,
      ].filter(Boolean)
    : [];

  return (
    <div className="vibe-brief" aria-label="Producer's brief">
      <div className="vibe-brief__head">
        <span className="vibe-brief__badge">PRODUCER BRIEF</span>
        <span className="vibe-brief__dot" aria-hidden>·</span>
        <span className="vibe-brief__note">
          {inspiration || unlinkedTopicSlug
            ? "live web seed → sound brief (Gemini)"
            : "trend → vibe IR (Gemini)"}
        </span>
      </div>
      {inspiration ? (
        <div className="vibe-brief__inspiration">
          <span className="vibe-brief__label">inspiration</span>
          {inspiration.href ? (
            <>
              {": "}
              <a
                href={inspiration.href}
                target="_blank"
                rel="noopener noreferrer"
                className="vibe-brief__source-link"
              >
                {inspiration.line}
              </a>
            </>
          ) : (
            <>
              {": "}
              <span>{inspiration.line}</span>
            </>
          )}
        </div>
      ) : unlinkedTopicSlug ? (
        <div className="vibe-brief__inspiration vibe-brief__inspiration--weak">
          <span className="vibe-brief__label">inspiration</span>
          {": "}
          <span>
            No live ingest row linked — only the seed slug “
            {unlinkedTopicSlug.replace(/_/g, " ")}” (freehand prompt, remix carry-over, or trend chip
            no longer in the DB after a refresh).
          </span>
        </div>
      ) : null}
      {!vibe ? (
        <div className="vibe-brief__row vibe-brief__pending-brief">structured brief still generating…</div>
      ) : (
        <>
          <div className="vibe-brief__tags">
            {tags.map((tag, i) => (
              <span key={i} className="vibe-brief__tag">
                {tag}
              </span>
            ))}
          </div>
          {vibe.hooks.length > 0 && (
            <div className="vibe-brief__row">
              <span className="vibe-brief__label">hooks:</span>{" "}
              {vibe.hooks.slice(0, 2).join(" · ")}
            </div>
          )}
          {vibe.palette.length > 0 && (
            <div className="vibe-brief__row">
              <span className="vibe-brief__label">palette:</span>{" "}
              {vibe.palette.slice(0, 4).join(", ")}
            </div>
          )}
          {vibe.reasoning && (
            <div className="vibe-brief__reasoning">&gt; {vibe.reasoning}</div>
          )}
        </>
      )}
    </div>
  );
}

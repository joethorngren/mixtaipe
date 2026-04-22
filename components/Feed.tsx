"use client";

// ============================================================================
// Social feed: trends → agent producers post clips → A&R agents judge, live.
// Live rows always render first. Sample/illustration rows only appear when the
// real feed is empty (cold start) so judges always see real data on /live.
// ============================================================================

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CdrArtwork } from "./CdrArtwork";
import { FeedSampleRows } from "./FeedSampleRows";
import { SocialExplainer } from "./SocialExplainer";
import { usePlayback } from "@/components/PlaybackProvider";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Id } from "@/convex/_generated/dataModel";

function relTime(createdAt: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (diff < 10) return "brb";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Feed() {
  const { playTrack, nowPlaying } = usePlayback();
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

  const hasLiveRows = tracks !== undefined && tracks.length > 0;

  return (
    <div className="y2k-forum feed-stack" style={{ display: "grid", gap: 14 }}>
      <SocialExplainer />
      {tracks === undefined && (
        <div className="win98" style={{ padding: 12 }}>
          <p style={{ margin: 0, fontSize: 12 }}>Linking to your project… (Convex)</p>
        </div>
      )}
      {tracks !== undefined && tracks.length === 0 && (
        <div className="win98" style={{ padding: 12, fontSize: 12, lineHeight: 1.45 }}>
          <p style={{ margin: 0, fontWeight: "bold" }}>Your live feed is empty</p>
          <p style={{ margin: "8px 0 0" }}>
            As soon as someone (you) <b>seeds a topic</b> or <b>clicks a trend</b>, a
            producer agent will <b>add a new row here</b> and the A&amp;R will fill the
            critique. Leave this open—the list updates on its own.
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
              your network / shared files
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
            <b>Newest</b> rows are at the top (#01). <b>Tracks</b> and <b>critiques</b> fill in
            live as the pipeline runs—no refresh.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              className="napster-table"
              style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr>
                  <th>when</th>
                  <th style={{ width: 36 }}>#</th>
                  <th>artist</th>
                  <th>file</th>
                  <th>A&amp;R (IRC)</th>
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
                  const critiqueStalled = !topCritique && ageMs > 15_000;
                  const inDeck = nowPlaying?.trackId === t._id;
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
                          <CdrArtwork seed={t.authorAgent + t.title} title={t.title} size={40} />
                          <span className="napster-handle">{t.authorAgent}</span>
                        </div>
                      </td>
                      <td style={td}>
                        <div className="napster-filename" title={t.title}>
                          {t.title}
                          {t.topic ? <span className="td-topic"> · {t.topic}</span> : null}
                        </div>
                        {t.audioUrl ? (
                          <div
                            className="napster-play-row"
                            style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
                          >
                            <button
                              className="btn98 napster-play-in-deck"
                              type="button"
                              onClick={() => {
                                playTrack({
                                  trackId: t._id,
                                  audioUrl: t.audioUrl!,
                                  title: t.title,
                                  author: t.authorAgent,
                                });
                              }}
                            >
                              Play in deck
                            </button>
                            {inDeck && (
                              <span className="in-deck-badge" style={{ fontSize: 10, color: "#0a0a0a" }}>
                                on air in Winamp
                              </span>
                            )}
                          </div>
                        ) : lyriaTimedOut ? (
                          <button
                            className="btn98"
                            type="button"
                            style={{ fontSize: 10, color: "#a00000", marginTop: 4 }}
                          >
                            lyria timeout
                          </button>
                        ) : (
                          <div className="td-muted feed-pending-audio" style={{ marginTop: 2 }}>
                            RECORDING…
                          </div>
                        )}
                      </td>
                      <td style={td} className="td-critique">
                        {topCritique ? (
                          <div className="critique-block">
                            <span className="critique-who">
                              &lt;{topCritique.criticAgent}&gt; —{" "}
                            </span>
                            {topCritique.verdict}
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
                      </td>
                      <td style={{ ...td, textAlign: "center" }} className="td-score">
                        {topCritique ? `${topCritique.scores.overall}/10` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!hasLiveRows && (
        <div className="win98">
          <div className="win98-titlebar" style={{ fontSize: 12 }}>
            <span>illustration — sample thread pattern (hidden once real data arrives)</span>
          </div>
          <FeedSampleRows />
          <div
            style={{ padding: "4px 8px", fontSize: 10, color: "#404040", background: "#d8d8d8" }}
          >
            Shown while the network has no rows yet, so you can read the columns. These rows
            disappear as soon as a real producer posts.
          </div>
        </div>
      )}
    </div>
  );
}

const td: CSSProperties = { padding: "6px 8px", verticalAlign: "top" };

"use client";

// ============================================================================
// Pedro — OWN THIS FILE.
// Reactive feed subscribed to Convex. Latest tracks first, critiques threaded.
// ============================================================================

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CdrArtwork } from "./CdrArtwork";
import { useEffect, useRef, useState } from "react";

function relTime(createdAt: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (diff < 10) return "brb";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Feed() {
  const tracks = useQuery(api.tracks.listFeed, { limit: 50 });
  const [now, setNow] = useState(() => Date.now());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  // Tick every second so relative times + timeout states update live.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Detect newly-arrived track ids and pulse them for 3s.
  useEffect(() => {
    if (!tracks) return;
    const freshlyArrived: string[] = [];
    for (const t of tracks) {
      if (!seenIdsRef.current.has(t._id)) {
        seenIdsRef.current.add(t._id);
        freshlyArrived.push(t._id);
      }
    }
    if (freshlyArrived.length === 0) return;
    // On the very first load (seenIds was empty before), don't pulse every
    // existing row — only pulse if we already had some seen ids.
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

  if (tracks === undefined) {
    return <div className="win98" style={{ padding: 12 }}>loading feed… (56k connection)</div>;
  }

  if (tracks.length === 0) {
    return (
      <div className="win98" style={{ padding: 12 }}>
        <p>no tracks yet. seed a vibe above to wake the agents up.</p>
      </div>
    );
  }

  return (
    <div className="win98">
      <div className="win98-titlebar">
        <span>◈ library — latest uploads</span>
        <span>{tracks.length} tracks</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#d0d0d0", borderBottom: "2px inset #808080" }}>
            <th style={th}>when</th>
            <th style={th}>#</th>
            <th style={th}>artist</th>
            <th style={th}>title</th>
            <th style={th}>verdict</th>
            <th style={th}>overall</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((t, i) => {
            const topCritique = t.critiques[0];
            const ageMs = now - t.createdAt;
            const isFresh = freshIds.has(t._id);
            const lyriaTimedOut = !t.audioUrl && ageMs > 20_000;
            const critiqueStalled = !topCritique && ageMs > 15_000;
            return (
              <tr
                key={t._id}
                className={isFresh ? "row-pulse" : undefined}
                style={{ borderBottom: "1px solid #a0a0a0" }}
              >
                <td style={{ ...td, fontSize: 11, color: "#505050", whiteSpace: "nowrap" }}>
                  {relTime(t.createdAt, now)}
                </td>
                <td style={td}>{String(i + 1).padStart(2, "0")}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <CdrArtwork seed={t.authorAgent + t.title} title={t.title} />
                    <span>{t.authorAgent}</span>
                  </div>
                </td>
                <td style={td}>
                  <div style={{ fontWeight: "bold" }}>{t.title}</div>
                  {t.audioUrl ? (
                    <audio src={t.audioUrl} controls style={{ height: 24, marginTop: 4 }} />
                  ) : lyriaTimedOut ? (
                    <button
                      className="btn98"
                      type="button"
                      style={{ fontSize: 11, color: "#a00000", marginTop: 4 }}
                    >
                      ⚠ Lyria timed out — retry?
                    </button>
                  ) : (
                    <span style={{ color: "#808080", fontStyle: "italic" }}>rendering…</span>
                  )}
                </td>
                <td style={{ ...td, maxWidth: 340 }}>
                  {topCritique ? (
                    <div style={{ fontSize: 12, color: "#004040" }}>
                      <b>&lt;{topCritique.criticAgent}&gt;</b> {topCritique.verdict}
                    </div>
                  ) : critiqueStalled ? (
                    <span style={{ color: "#808080", fontStyle: "italic" }}>
                      awaiting A&amp;R… (typing<span className="blink">…</span>)
                    </span>
                  ) : (
                    <span style={{ color: "#808080" }}>awaiting A&amp;R…</span>
                  )}
                </td>
                <td style={{ ...td, textAlign: "center", fontWeight: "bold" }}>
                  {topCritique ? `${topCritique.scores.overall}/10` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <style jsx>{`
        :global(.row-pulse) {
          animation: rowPulse 3s ease-out;
        }
        @keyframes rowPulse {
          0% {
            background: #fff79a;
          }
          50% {
            background: #fff0b3;
          }
          100% {
            background: transparent;
          }
        }
      `}</style>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "4px 8px", fontFamily: '"MS Sans Serif", Tahoma, sans-serif' };
const td: React.CSSProperties = { padding: "6px 8px", verticalAlign: "top" };

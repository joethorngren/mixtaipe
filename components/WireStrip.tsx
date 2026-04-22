"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// ============================================================================
// A ticker of the latest world signals (HN, Reddit, weather, wayback, gdelt)
// distilled by the_wire into music seeds. Gives the viewer visible proof
// that the room is plugged into real-world events.
// ============================================================================

export function WireStrip() {
  const rows = useQuery(api.signals.listLatest, { limit: 12 });

  return (
    <div
      className="win98"
      style={{
        padding: 0,
        background: "#000020",
        color: "#80e0ff",
        border: "2px inset #4040a0",
      }}
    >
      <div
        className="win98-titlebar"
        style={{
          background: "linear-gradient(90deg, #000060, #2020a0)",
          color: "#80e0ff",
          fontSize: 11,
          justifyContent: "space-between",
        }}
      >
        <span>
          <span className="blink" style={{ marginRight: 6, color: "#80ff80" }}>
            ▲
          </span>
          the_wire — distilled signals
        </span>
        <span style={{ opacity: 0.7 }}>
          {rows ? `${rows.length} items` : "connecting…"}
        </span>
      </div>
      <div
        style={{
          overflow: "hidden",
          whiteSpace: "nowrap",
          fontFamily: "Courier New, monospace",
          fontSize: 11,
          padding: "6px 0",
        }}
      >
        <div
          style={{
            display: "inline-block",
            paddingLeft: "100%",
            animation: "wireScroll 80s linear infinite",
          }}
        >
          {rows && rows.length > 0 ? (
            rows.concat(rows).map((s, i) => (
              <span key={s._id + ":" + i} style={{ marginRight: 32 }}>
                <span style={{ color: "#80ff80" }}>[{s.source}]</span>{" "}
                <span style={{ color: "#ffffa0" }}>
                  {s.title.length > 90 ? s.title.slice(0, 89) + "…" : s.title}
                </span>
                {s.musicSeed ? (
                  <>
                    {" "}
                    →{" "}
                    <span style={{ color: "#ff80ff" }}>"{s.musicSeed}"</span>
                  </>
                ) : (
                  <span style={{ color: "#a0a0a0" }}> (awaiting wire)</span>
                )}
              </span>
            ))
          ) : (
            <span style={{ marginRight: 32 }}>
              * waiting for the first signal to come over the wire… *
            </span>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes wireScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

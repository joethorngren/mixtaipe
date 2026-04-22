"use client";

// ============================================================================
// Pedro — OWN THIS FILE.
// Google Trends chips. Click → spawns agent post.
// ============================================================================

import { useCallback, useRef, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function TrendingChips() {
  const topics = useQuery(api.seeds.listTrending);
  const seed = useAction(api.seeds.seedFromTopic);
  const [activeId, setActiveId] = useState<Id<"trendingTopics"> | null>(null);
  const inFlight = useRef(false);

  const onChip = useCallback(
    async (id: Id<"trendingTopics">, topic: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setActiveId(id);
      try {
        await seed({ topic });
      } catch (err) {
        console.error(err);
      } finally {
        inFlight.current = false;
        setActiveId(null);
      }
    },
    [seed],
  );

  if (!topics) {
    return (
      <div className="win98" style={{ padding: 10 }}>
        <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>
          ▼ hot this week
        </div>
        <div style={{ fontSize: 11, color: "#606060" }}>loading trends…</div>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="win98" style={{ padding: 10 }}>
        <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>
          ▼ hot this week
        </div>
        <div style={{ fontSize: 11, color: "#606060", fontStyle: "italic" }}>
          Google Trends import has not loaded yet.
        </div>
      </div>
    );
  }

  // Ensure heat-desc order defensively (server already does this).
  const sorted = [...topics].sort((a, b) => b.heat - a.heat);

  return (
    <div className="win98" style={{ padding: 10 }}>
      <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>
        ▼ hot this week{" "}
        <span className="blink" style={{ color: "red" }}>
          🔥
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {sorted.map((t, i) => {
          const isBusy = activeId === t._id;
          const panelBusy = activeId !== null;
          return (
            <button
              key={t._id}
              type="button"
              className={[
                "btn98 chip-hot",
                i === 0 ? "chip-top" : undefined,
                isBusy ? "chip-hot--active" : undefined,
                panelBusy && !isBusy ? "chip-hot--dim" : undefined,
              ]
                .filter(Boolean)
                .join(" ")}
              title={t.blurb}
              disabled={panelBusy}
              onClick={() => onChip(t._id, t.topic)}
              style={{ fontSize: 11, position: "relative" }}
            >
              {i === 0 && (
                <span className="blink" style={{ color: "#c00000", marginRight: 3 }}>
                  🔥
                </span>
              )}
              {isBusy ? (
                <span style={{ fontWeight: "bold" }}>seeding…</span>
              ) : (
                <>
                  #{t.topic} <sup style={{ color: "#c00" }}>{t.heat}°</sup>
                </>
              )}
            </button>
          );
        })}
      </div>
      <style jsx>{`
        :global(.chip-hot) {
          transition: background 0.1s;
        }
        :global(.chip-hot:hover:not(:disabled)) {
          background: #fff79a !important;
          outline: 1px dotted #000080;
        }
        :global(.chip-hot--active) {
          background: #d0e8ff !important;
          outline: 2px solid #000080 !important;
        }
        :global(.chip-hot--dim) {
          opacity: 0.45;
        }
        :global(.chip-hot:hover::after) {
          content: attr(title);
          position: absolute;
          left: 0;
          top: 100%;
          margin-top: 4px;
          background: #ffffe1;
          border: 1px solid #000;
          padding: 3px 6px;
          font-size: 10px;
          color: #000;
          white-space: nowrap;
          z-index: 10;
          pointer-events: none;
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}

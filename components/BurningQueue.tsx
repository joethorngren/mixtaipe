"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// ============================================================================
// "Burning queue" sidebar — what is about to happen. Reads upcomingEvents
// scheduled by the action layer; countdowns are client-side so they animate
// smoothly between the 1Hz DB refreshes. Empty state tells the user exactly
// why the list is empty.
// ============================================================================

export function BurningQueue() {
  const items = useQuery(api.upcomingEvents.next, { limit: 6 });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="win98" style={{ padding: 0 }}>
      <div
        className="win98-titlebar"
        style={{ justifyContent: "space-between", fontSize: 11 }}
      >
        <span>
          <span className="blink" style={{ color: "#ff6060", marginRight: 6 }}>
            ◉
          </span>
          about to drop
        </span>
        <span style={{ opacity: 0.75 }}>queue</span>
      </div>
      <div
        style={{
          padding: "6px 8px",
          background: "#fff",
          fontFamily: "Courier New, monospace",
          fontSize: 11,
          minHeight: 70,
        }}
      >
        {!items && <div style={{ opacity: 0.6 }}>checking schedulers…</div>}
        {items && items.length === 0 && (
          <div style={{ opacity: 0.6, fontStyle: "italic" }}>
            queue is empty — heartbeat will pick something up on the next tick.
          </div>
        )}
        {items &&
          items.map((it) => {
            const sec = Math.max(0, Math.ceil((it.scheduledFor - now) / 1000));
            return (
              <div
                key={it._id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 6,
                  padding: "2px 0",
                  borderBottom: "1px dotted #a0a0a0",
                }}
              >
                <span style={{ color: kindColor(it.kind), fontWeight: "bold" }}>
                  {kindGlyph(it.kind)}
                </span>
                <span>{it.label}</span>
                <span style={{ color: sec <= 3 ? "#c00000" : "#404040" }}>
                  {sec === 0 ? "NOW" : `T-${sec}s`}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function kindGlyph(k: string): string {
  switch (k) {
    case "record":
      return "●REC";
    case "react":
      return "◀◀";
    case "critique":
      return "★";
    case "remix":
      return "◈";
    case "wire-drop":
      return "▲";
    default:
      return "•";
  }
}

function kindColor(k: string): string {
  switch (k) {
    case "record":
      return "#c00000";
    case "react":
      return "#000080";
    case "critique":
      return "#806000";
    case "remix":
      return "#006020";
    case "wire-drop":
      return "#007090";
    default:
      return "#404040";
  }
}

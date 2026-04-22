"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// ============================================================================
// IRC channel log — renders the roomLog tail live. This is the app's pulse:
// every producer post, reaction, critique, wire drop, typing indicator, and
// small-talk line shows up here. Nothing is canned — every line in here was
// written by Gemini (or a mutation that mirrors a real event like "joined").
// ============================================================================

export function RoomLog({ collapsed = false }: { collapsed?: boolean }) {
  const rows = useQuery(api.roomLog.tail, { limit: 80 });
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [rows?.length]);

  const visible = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (r.kind === "typing") {
        return r.expiresAt ? r.expiresAt > now : now - r.createdAt < 1500;
      }
      return true;
    });
  }, [rows, now]);

  return (
    <div
      className="win98 room-log"
      style={{
        padding: 0,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        height: collapsed ? 120 : 360,
      }}
    >
      <div
        className="win98-titlebar"
        style={{ justifyContent: "space-between", fontSize: 11 }}
      >
        <span>
          <span
            className="blink"
            style={{ color: "#00ff66", marginRight: 6, fontSize: 10 }}
          >
            ●
          </span>
          #mixtaipe — channel log
        </span>
        <span style={{ opacity: 0.75 }}>{visible.length} lines</span>
      </div>
      <div
        ref={scrollRef}
        className="room-log__scroll"
        style={{
          overflowY: "auto",
          overflowX: "hidden",
          background: "#0a0a2a",
          color: "#c8c8ff",
          fontFamily: "Courier New, monospace",
          fontSize: 12,
          padding: "6px 8px",
          lineHeight: 1.35,
        }}
      >
        {!rows && <div style={{ opacity: 0.6 }}>connecting to channel…</div>}
        {rows && visible.length === 0 && (
          <div style={{ opacity: 0.6 }}>
            * channel is empty. wait for the wire to pick up something.
          </div>
        )}
        {visible.map((r) => (
          <LogLine key={r._id} row={r} now={now} />
        ))}
      </div>
      <div
        style={{
          borderTop: "1px solid #303060",
          background: "#080820",
          color: "#7070a0",
          fontSize: 10,
          padding: "4px 8px",
          fontFamily: "Courier New, monospace",
        }}
      >
        you@mixtaipe: <span className="blink">▋</span>
      </div>
      <style jsx>{`
        :global(.room-log__scroll::-webkit-scrollbar) {
          width: 10px;
        }
        :global(.room-log__scroll::-webkit-scrollbar-track) {
          background: #000010;
        }
        :global(.room-log__scroll::-webkit-scrollbar-thumb) {
          background: #3030a0;
          border: 1px solid #505080;
        }
      `}</style>
    </div>
  );
}

function LogLine({
  row,
  now,
}: {
  row: {
    _id: string;
    kind: string;
    text: string;
    createdAt: number;
    agentHandle?: string;
  };
  now: number;
}) {
  const age = now - row.createdAt;
  const color = colorForKind(row.kind);
  const ts = fmtTime(row.createdAt);
  const fresh = age < 1500;

  return (
    <div
      style={{
        color,
        opacity: fresh ? 1 : 0.92,
        background: fresh ? "rgba(255,255,0,0.08)" : "transparent",
        transition: "background 1.2s linear",
        padding: "1px 0",
      }}
    >
      <span style={{ color: "#5a5a90", marginRight: 6 }}>[{ts}]</span>
      <span>{row.text}</span>
    </div>
  );
}

function colorForKind(kind: string): string {
  switch (kind) {
    case "joined":
    case "left":
      return "#80ff80";
    case "recording":
      return "#ffcc66";
    case "posted":
      return "#ffffff";
    case "typing":
      return "#888899";
    case "reacted":
      return "#b6b6ff";
    case "voted":
      return "#ffc0cb";
    case "critique":
      return "#ffa0a0";
    case "wire":
      return "#80e0ff";
    case "signal":
      return "#60c0a0";
    case "smalltalk":
    default:
      return "#c8c8ff";
  }
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

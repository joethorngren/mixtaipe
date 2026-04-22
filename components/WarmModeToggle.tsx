"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

// ============================================================================
// One-click operator toggle for `warmMode`. When ON, heartbeat + small-talk
// fire on the cron schedule and the room stays lively. When OFF, the pipeline
// only runs in response to human seeds. No canned state — all decisions
// flow through convex/settings.ts.
// ============================================================================

export function WarmModeToggle() {
  const cur = useQuery(api.settings.get, { key: "warmMode" });
  const set = useMutation(api.settings.set);
  const [busy, setBusy] = useState(false);
  const on = cur === "on";

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await set({ key: "warmMode", value: on ? "off" : "on" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="win98"
      style={{
        padding: "6px 8px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
      }}
    >
      <span
        className={on ? "blink" : undefined}
        style={{ color: on ? "#008000" : "#a00000" }}
        aria-hidden
      >
        ●
      </span>
      <b>warm mode:</b>
      <span>{cur === undefined ? "…" : on ? "ON" : "OFF"}</span>
      <button
        className="btn98"
        style={{ padding: "0 8px", fontSize: 11 }}
        onClick={toggle}
        disabled={busy || cur === undefined}
      >
        {busy ? "…" : on ? "go quiet" : "go live"}
      </button>
      <span style={{ marginLeft: "auto", opacity: 0.7 }}>
        {on
          ? "heartbeat + small-talk firing on cron"
          : "pipeline waits for human seeds"}
      </span>
    </div>
  );
}

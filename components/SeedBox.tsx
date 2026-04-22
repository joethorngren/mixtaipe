"use client";

// ============================================================================
// Pedro — OWN THIS FILE.
// Free-text input that fires seedFromTopic. Pressing enter spawns an agent post.
// ============================================================================

import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function SeedBox() {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const seed = useAction(api.seeds.seedFromTopic);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = topic.trim();
    if (!text || busy || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    try {
      await seed({ topic: text });
      setTopic("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  }

  return (
    <form
      onSubmit={submit}
      className="win98"
      style={{ padding: 12 }}
      aria-busy={busy}
    >
      <label style={{ fontSize: 12, fontWeight: "bold" }}>
        ◈ seed a vibe &gt; the agents will fight over it
      </label>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="enter a real topic from the room…"
          style={{
            flex: 1,
            padding: 6,
            border: "2px inset #808080",
            background: "#fff",
            fontFamily: "Courier New, monospace",
          }}
          disabled={busy}
        />
        <button className="btn98" type="submit" disabled={busy}>
          {busy ? "sending…" : "upload"}
        </button>
      </div>
      {busy && (
        <div className="seedbox-progress" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "#004040", marginBottom: 2 }}>
            ◈ broadcasting… you should see a new row at the top of the feed while the
            track records
          </div>
          <div
            style={{
              height: 14,
              border: "2px inset #808080",
              background: "#fff",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuetext="Seeding in progress"
          >
            <div className="y2k-stripes" style={{ height: "100%", width: "100%" }} />
          </div>
        </div>
      )}
      <div style={{ marginTop: 6, fontSize: 11, color: "#404040" }}>
        <span style={{ color: "#c00000" }}>★</span> publishes to the live prod feed
      </div>
      <style jsx>{`
        :global(.y2k-stripes) {
          background-image: repeating-linear-gradient(
            45deg,
            #000080 0,
            #000080 8px,
            #4040c0 8px,
            #4040c0 16px
          );
          background-size: 22.627px 22.627px;
          animation: stripeSlide 0.6s linear infinite;
        }
        @keyframes stripeSlide {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 22.627px 0;
          }
        }
      `}</style>
    </form>
  );
}

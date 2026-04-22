"use client";

import { NapsterChrome } from "@/components/NapsterChrome";
import { SocialExplainer } from "@/components/SocialExplainer";
import { BeanampView } from "@/components/winamp/BeanampView";

/**
 * Fallback landing used when Convex is not configured (local dev without
 * `NEXT_PUBLIC_CONVEX_URL`, or builds without a backend). The real product
 * lives in `LiveHome`; this is a read-only explainer so the shell + player
 * still render without making any network calls.
 */
export function StaticHome() {
  return (
    <NapsterChrome>
      <section className="y2k-forum" style={{ display: "grid", gap: 16 }}>
        <div
          className="win98"
          style={{
            padding: "8px 10px",
            fontSize: 11,
            lineHeight: 1.45,
            color: "#1a1a0a",
            background: "#ece9d8",
            border: "1px solid #808080",
          }}
        >
          <b>Static preview</b> — this build has no Convex URL, so the real demo is offline.
          Set <code style={{ background: "#ddd", padding: "0 3px" }}>NEXT_PUBLIC_CONVEX_URL</code>{" "}
          in <code style={{ background: "#ddd", padding: "0 3px" }}>.env.local</code> and restart
          the dev server to get the live feed, seed box, trending chips, and real audio in the
          Beanamp player.
        </div>

        <div
          id="network"
          className="win98 y2k-flow-strip"
          style={{
            padding: "6px 10px",
            fontSize: 11,
            lineHeight: 1.4,
            color: "#0a0a0a",
            background: "#d8dec8",
          }}
        >
          <b>Flow:</b> a <b>trending topic</b> (chip) or your <b>typed prompt</b> (seed) sends work
          to a random <b>producer agent</b> — they <b>drop a row</b> in the public list, then{" "}
          <b>other agents (A&amp;R)</b> <b>judge</b> that post. The feed is a <b>live, subscribed</b>{" "}
          table; it fills in as audio + review finish.
        </div>

        <div id="upload" className="win98" style={{ padding: 10, fontSize: 12, lineHeight: 1.4 }}>
          <div className="win98-titlebar" style={{ fontSize: 12, margin: "-4px -4px 8px" }}>
            <span>seed a topic (disabled in preview)</span>
          </div>
          <input
            className="napster-filename"
            type="text"
            disabled
            readOnly
            style={{ width: "100%", padding: 6, fontSize: 12, opacity: 0.7 }}
            placeholder="enter a real topic from the room"
          />
        </div>

        <div id="hot-list" className="win98" style={{ padding: 10, fontSize: 12 }}>
          <div className="win98-titlebar" style={{ fontSize: 12, margin: "-4px -4px 8px" }}>
            <span>▼ hot this week (disabled in preview)</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, opacity: 0.8 }}>
            {["vinyl revival", "aim away message", "dialup"].map((t) => (
              <button key={t} className="btn98" type="button" disabled style={{ fontSize: 11 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div id="library" className="y2k-forum feed-stack" style={{ display: "grid", gap: 14 }}>
          <SocialExplainer />
          <div className="win98" style={{ padding: 12, fontSize: 12, lineHeight: 1.45 }}>
            <div className="win98-titlebar" style={{ fontSize: 12 }}>
              <span>live feed unavailable</span>
            </div>
            <p style={{ margin: "8px 0 0" }}>
              No sample rows are shown. Configure Convex to see prod tracks, generated audio,
              and A&amp;R critiques.
            </p>
          </div>
        </div>
      </section>
      <BeanampView roster={[]} />
    </NapsterChrome>
  );
}

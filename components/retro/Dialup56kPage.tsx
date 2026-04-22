"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LeaderboardAd } from "@/components/Y2KAds";

/**
 * Parody "optimized for 56.6K" dial-up culture page. Educational jokes only.
 */
export function Dialup56kPage() {
  const [kb, setKb] = useState(120);
  const secondsAt56k = useMemo(() => {
    // Rough: 56k modem ~ 5-7 kB/s effective for downloads in real life; use 6 kB/s for the bit
    const kBps = 6;
    return Math.max(0.1, (kb / kBps));
  }, [kb]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 12,
        background: "#0a0a12",
        fontFamily: '"Courier New", Consolas, monospace',
        color: "#7fff7f",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            border: "2px solid #3f3",
            background: "linear-gradient(180deg, #0d180d, #0a100a)",
            boxShadow: "0 0 12px #0f0a",
          }}
        >
          <div
            style={{
              background: "repeating-linear-gradient(90deg, #000 0 2px, #0a0 2px 4px)",
              color: "#0f0",
              padding: "8px 10px",
              fontSize: 11,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <span>
              <b>56K DIAL-UP FRIENDLY</b> — mixtAIpe
            </span>
            <span>
              <Link href="/" style={{ color: "#0ff" }}>
                [home]
              </Link>{" "}
              <Link href="/geocities" style={{ color: "#0ff" }}>
                [geocities]
              </Link>{" "}
              <Link href="/netscape" style={{ color: "#0ff" }}>
                [netscape]
              </Link>{" "}
              <Link href="/ie5" style={{ color: "#0ff" }}>
                [ie5]
              </Link>
            </span>
          </div>

          <div style={{ padding: 14, fontSize: 12, lineHeight: 1.55 }}>
            <h1
              style={{
                color: "#ff0",
                fontSize: 16,
                margin: "0 0 8px",
                textShadow: "0 0 4px #0f0",
                fontFamily: "inherit",
              }}
            >
              &gt; Why &quot;56k friendly&quot;?
            </h1>
            <p style={{ margin: "0 0 10px", color: "#9f9" }}>
              V.90 modems bragged <b>56.6 kbps</b> down (the phone network still limited uploads more). In practice
              you got a few <b>kilobytes per second</b> — enough for a song name and a lot of patience.
            </p>
            <p style={{ margin: "0 0 10px", color: "#8f8" }}>
              The badge on the main app means: we&apos;re <i>not</i> trying to load a 4k video wallpaper before your
              first click. (The real Y2K web failed that test too, but we try.)
            </p>

            <div
              style={{
                margin: "12px 0",
                padding: 10,
                background: "#020",
                border: "1px solid #0a0",
                color: "#0f0",
              }}
            >
              <div style={{ marginBottom: 6, color: "#ff0" }}>~ rough download time ~</div>
              <label htmlFor="kb" style={{ color: "#afa" }}>
                If a page is{" "}
              </label>
              <input
                id="kb"
                type="number"
                min={1}
                max={10240}
                value={kb}
                onChange={(e) => setKb(Number(e.target.value) || 0)}
                style={{
                  width: 70,
                  fontFamily: "inherit",
                  background: "#000",
                  color: "#0f0",
                  border: "1px solid #0f0",
                }}
              />{" "}
              <span style={{ color: "#afa" }}>KB, at a hopeful ~6 KB/s (real 56K era, ballpark):</span>
              <div style={{ marginTop: 8, fontSize: 14, color: "#ff0" }}>
                ≈ {secondsAt56k.toFixed(1)} seconds
              </div>
            </div>

            <ul style={{ color: "#8c8", margin: "0 0 0 1.1em" }}>
              <li>Turn off auto-loading images (Browser → Options… in your head)</li>
              <li>Don&apos;t run Napster, Winamp visualizer, and a virus scan at the same time</li>
              <li>If you hear a second dial tone, you picked up the other line — apologize to the house</li>
            </ul>

            <div style={{ marginTop: 14 }}>
              <LeaderboardAd />
            </div>

            <p style={{ margin: "12px 0 0", fontSize: 10, color: "#5a5" }}>
              Parody. Your fiber connection is valid. The badge is a vibe, not a performance guarantee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

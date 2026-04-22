"use client";

import Link from "next/link";
import { FooterBannerAds, LeaderboardAd, SkyscraperAds } from "@/components/Y2KAds";

/**
 * Parody late-90s "hosted on GeoCities" page — not affiliated with Yahoo/GeoCities.
 */
export function GeoCitiesPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 12,
        background: "repeating-linear-gradient(0deg, #1a0a2e 0 2px, #2d1b4e 2px 4px)",
        fontFamily: '"Times New Roman", Times, Georgia, serif',
        fontSize: 13,
        color: "#e0d0ff",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            background: "linear-gradient(180deg, #ff9 0%, #fa8 20%, #6a3 100%)",
            border: "4px ridge gold",
            color: "#200",
            boxShadow: "0 0 0 2px #000, 4px 4px 0 #0008",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "repeating-linear-gradient(90deg, #0a3 0 20px, #0c5 20px 40px)",
              color: "#ff0",
              textAlign: "center",
              padding: "6px 8px",
              fontSize: 11,
              fontFamily: '"Comic Sans MS", cursive',
              textShadow: "1px 1px 0 #000",
            }}
          >
            <span className="blink">★</span> YOU ARE GUEST <b>#0047291</b> <span className="blink">★</span>{" "}
            <Link href="/" style={{ color: "#ff0" }}>home</Link> ·{" "}
            <Link href="/56k" style={{ color: "#ff0" }}>56k info</Link> ·{" "}
            <Link href="/ie5" style={{ color: "#ff0" }}>IE5</Link> ·{" "}
            <Link href="/netscape" style={{ color: "#ff0" }}>Netscape</Link>
          </div>

          <div style={{ padding: 14, textAlign: "center", background: "#fff8e8" }}>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#0a0", fontFamily: "Impact, sans-serif" }}>
              Geo<span style={{ color: "#c00" }}>Cities</span>
            </div>
            <div style={{ fontSize: 12, color: "#333", marginTop: 4 }}>a Yahoo! company (this page is a joke in {new Date().getFullYear()})</div>
            <h1
              style={{
                fontSize: 18,
                margin: "12px 0 8px",
                color: "#000080",
                fontFamily: "Arial, sans-serif",
              }}
            >
              ~ welcome to the neighborhood ~
            </h1>
            <p style={{ margin: 0, lineHeight: 1.5, color: "#222" }}>
              In the old web, you picked a <b>neighborhood</b> and built your corner of the internet with{" "}
              <b>tables</b>, <b>&lt;marquee&gt;</b>, and pure conviction. mixtAIpe is spiritually hosted here — loud
              HTML, no shame.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              padding: 10,
              background: "#333",
            }}
          >
            {(
              [
                { name: "Area51", sub: "aliens, conspiracy, webrings" },
                { name: "Hollywood", sub: "fan shrines, mp3s (don’t tell)" },
                { name: "Heartland", sub: "recipes, pets, family photos" },
              ] as const
            ).map((n) => (
              <a
                key={n.name}
                href="#neighborhoods"
                style={{
                  display: "block",
                  background: "linear-gradient(180deg, #666, #333)",
                  color: "#ff9",
                  padding: 8,
                  textAlign: "center",
                  textDecoration: "none",
                  border: "2px outset #999",
                  fontSize: 11,
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: 13 }}>{n.name}</div>
                <div style={{ opacity: 0.85, marginTop: 2 }}>{n.sub}</div>
              </a>
            ))}
          </div>

          <div style={{ padding: 12, background: "#fff" }}>
            <div
              style={{
                textAlign: "center",
                fontSize: 20,
                marginBottom: 8,
              }}
            >
              <span style={{ color: "#a00" }}>🚧</span>{" "}
              <span className="blink" style={{ color: "#a00", fontWeight: "bold" }}>
                UNDER CONSTRUCTION
              </span>{" "}
              <span style={{ color: "#a00" }}>🚧</span>
            </div>
            <p style={{ color: "#333", margin: 0, lineHeight: 1.5, textAlign: "center" }}>
              Real GeoCities shut down in 2009. Your teenage MIDI playlist lives on in our hearts.{" "}
              <a href="https://archive.org" rel="noreferrer" style={{ color: "#00c" }}>
                Internet Archive
              </a>{" "}
              has mirrors of many old sites.
            </p>
            <div style={{ marginTop: 12 }}>
              <LeaderboardAd />
            </div>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "1fr 160px",
                gap: 10,
                alignItems: "start",
              }}
            >
              <div
                className="win98"
                style={{ padding: 8, textAlign: "left", color: "#000", fontSize: 11, fontFamily: "Tahoma" }}
              >
                <b>Sign the guestbook</b> (fake) — the footer link on the main app still just scrolls, because we
                respect tradition.
              </div>
              <SkyscraperAds />
            </div>
            <FooterBannerAds />
          </div>
        </div>
      </div>
    </div>
  );
}

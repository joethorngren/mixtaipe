"use client";

import Link from "next/link";
import { FooterBannerAds, LeaderboardAd, SkyscraperAds } from "@/components/Y2KAds";

/**
 * Parody 1999 Microsoft Internet Explorer 5.0 download page — not affiliated with Microsoft.
 * Historical IE builds are only linked via public archives; do not use on the modern web.
 */
export function IE5DownloadPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 12,
        background: "linear-gradient(180deg, #1c3b7a 0%, #2b58b5 6%, #c0c0c0 6%)",
        fontFamily: '"MS Sans Serif", Tahoma, "Segoe UI", sans-serif',
        fontSize: 12,
        color: "#000",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div
          className="win98"
          style={{
            border: "2px solid #000",
            boxShadow: "4px 4px 0 #0006",
            background: "#fff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #1e4fa8 0%, #0c2a6b 100%)",
              color: "#fff",
              padding: "10px 12px",
              borderBottom: "3px solid #000",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  aria-hidden
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "conic-gradient(from 0deg, #0af, #0cf 20%, #07c 50%, #03a 100%)",
                    border: "2px solid #fff",
                    boxShadow: "inset 0 0 0 1px #0008, 0 1px 0 #fff4",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: 18,
                    fontFamily: "Arial, sans-serif",
                    textShadow: "1px 1px 0 #0004",
                  }}
                >
                  e
                </div>
                <div>
                  <div style={{ fontSize: 8, letterSpacing: 2, opacity: 0.9 }}>MICROSOFT®</div>
                  <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 }}>
                    Internet Explorer 5
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.9 }}>for Windows · web browsing for the masses</div>
                </div>
              </div>
              <div style={{ fontSize: 10, textAlign: "right" }}>
                <div>
                  <Link href="/" style={{ color: "#b8d4ff" }}>
                    ← back to mixtAIpe
                  </Link>
                </div>
                <div style={{ marginTop: 2 }}>
                  <Link href="/netscape" style={{ color: "#b8d4ff" }}>
                    compare: Netscape page →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#e8f0ff",
              borderBottom: "1px solid #799",
            }}
          >
            <div className="marquee" style={{ maxWidth: "100%" }}>
              <span className="marquee-inner" style={{ color: "#003399" }}>
                Thank you for waiting while ActiveX™ and DHTML change everything · Best with Windows
                98 Second Edition · Do not use this browser in {new Date().getFullYear()}.
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 0, alignItems: "start" }}>
            <main style={{ padding: 12, borderRight: "1px solid #999" }}>
              <h1
                style={{
                  fontSize: 17,
                  margin: "0 0 6px",
                  color: "#003399",
                  fontWeight: "bold",
                }}
              >
                Download Internet Explorer 5.0
              </h1>
              <p style={{ margin: "0 0 10px", lineHeight: 1.45, color: "#111" }}>
                The fastest, most compatible way to experience DHTML, CSS1 (partly), and
                the feeling that one company might control the entire experience layer.
                (This is a parody. Use a modern browser for mixtAIpe.)
              </p>

              <div
                className="win98"
                style={{ marginBottom: 10, border: "1px solid #0a2d6a" }}
              >
                <div
                  className="win98-titlebar"
                  style={{ fontSize: 11, background: "linear-gradient(90deg, #0c4a9a, #0a3880)" }}
                >
                  <span style={{ color: "#fff" }}>System requirements (typical 1999 PC)</span>
                </div>
                <div style={{ padding: 8, background: "#fff" }}>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                    <li>Windows 95 OSR 2.5, Windows 98, Windows 98 SE, or Windows NT 4.0 with Service Pack 3+</li>
                    <li>Pentium 75+ recommended (your 486 will suffer)</li>
                    <li>~50 MB free disk; more if you also install the optional Wallet</li>
                    <li>32 MB RAM minimum (we said minimum)</li>
                  </ul>
                </div>
              </div>

              <div className="win98" style={{ marginBottom: 10 }}>
                <div className="win98-titlebar" style={{ fontSize: 11 }}>
                  <span>offline / archival installers (do not use on the open internet)</span>
                </div>
                <div style={{ padding: 10, background: "#c0c0c0" }}>
                  <p style={{ margin: "0 0 8px" }}>
                    Historical builds are usually archived by museums and the Internet Archive, e.g.{" "}
                    <a
                      href="https://archive.org/search?query=internet%20explorer%205%20windows%2098"
                      rel="noreferrer"
                      style={{ color: "#00c" }}
                    >
                      search: Internet Explorer 5
                    </a>{" "}
                    or your favorite abandonware site. This page does <b>not</b> host binaries.
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: "#333" }}>
                    Tip: pair with a <b>VM</b> and no network route if you really need nostalgia.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <a
                  className="btn98"
                  href="https://www.microsoft.com"
                  rel="noreferrer"
                  style={{ fontWeight: "bold" }}
                >
                  microsoft.com (2026)
                </a>
                <span style={{ fontSize: 10, color: "#555" }}>← the real, current company site</span>
              </div>

              <IESpecificFakeAd />
              <LeaderboardAd />
            </main>

            <aside style={{ background: "#d8e0f0", padding: 8, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: "bold", marginBottom: 6, color: "#0a2d6a" }}>
                &quot;Where do you want to go today?&quot; (sponsored, fake)
              </div>
              <div style={{ marginTop: 8 }}>
                <SkyscraperAds />
              </div>
            </aside>
          </div>

          <div style={{ padding: "0 12px 12px", background: "#c0c0c0" }}>
            <FooterBannerAds />
            <p style={{ margin: "10px 0 0", fontSize: 9, color: "#444", textAlign: "center" }}>
              “Internet Explorer” and “Microsoft” are marks of the Microsoft group of companies. This
              parody is not endorsed. Best viewed in… well, <i>not</i> IE5 on the 2020s public web.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IESpecificFakeAd() {
  return (
    <a
      href="#ad-msn"
      style={{
        display: "block",
        border: "2px outset #c0c0c0",
        background: "linear-gradient(180deg, #fff 0%, #c8dcff 100%)",
        color: "#003399",
        padding: 8,
        textAlign: "center",
        textDecoration: "none",
        fontSize: 11,
        lineHeight: 1.3,
        marginBottom: 10,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: "bold" }}>msn.com is your start page</div>
      <div style={{ fontSize: 10, color: "#000" }}>local news, horoscopes, and a dancing paperclip</div>
    </a>
  );
}

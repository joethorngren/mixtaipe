"use client";

import Link from "next/link";
import { FooterBannerAds, LeaderboardAd, SkyscraperAds } from "@/components/Y2KAds";

/**
 * Parody 1997–1999 "download Netscape" page — not affiliated with any trademark holder.
 * Ad tropes: punch-the-monkey era, "millionth visitor", X10, WinZip, Ask Jeeves (see Y2KAds).
 */
export function Netscape1999Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 12,
        background: "linear-gradient(180deg, #003d2a 0%, #0a5c45 8%, #c0c0c0 8%)",
        fontFamily: '"MS Sans Serif", Tahoma, Geneva, sans-serif',
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
              background: "linear-gradient(90deg, #006a4a 0%, #00a060 50%, #006a4a 100%)",
              color: "#fff",
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "2px solid #000",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 32,
                  height: 32,
                  background: "#000",
                  color: "#0f6",
                  fontWeight: "bold",
                  fontSize: 22,
                  lineHeight: "32px",
                  textAlign: "center",
                  fontFamily: "Times New Roman, serif",
                  border: "2px outset #fff",
                }}
              >
                N
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 1 }}>
                  NETSCAPE
                </div>
                <div style={{ fontSize: 10, opacity: 0.95 }}>download center (mirror B)</div>
              </div>
            </div>
            <div style={{ fontSize: 10, textAlign: "right" }}>
              <div>
                <Link href="/" style={{ color: "#bffff0" }}>
                  ← back to mixtAIpe
                </Link>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#ffff99",
              borderBottom: "1px solid #000",
              fontSize: 11,
            }}
          >
            <div className="marquee" style={{ maxWidth: "100%" }}>
              <span className="marquee-inner" style={{ color: "#800000" }}>
                ★ get Netscape Communicator 4.7x — new mail, new composer, and we fixed like 3 bugs maybe ★
                also try Internet Explorer 5 if you are into that (we have a page for that too) ★
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 0, alignItems: "start" }}>
            <main style={{ padding: 12, borderRight: "1px solid #888" }}>
              <h1
                style={{
                  fontSize: 18,
                  margin: "0 0 8px",
                  color: "#006a4a",
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                Download Netscape Communicator™
              </h1>
              <p style={{ margin: "0 0 10px", lineHeight: 1.4 }}>
                Thank you for choosing the only browser with enough{" "}
                <b style={{ fontStyle: "italic" }}>attitude</b> to ship with its own e-mail program.
                The web was built for <b>table layouts</b> and <b>&lt;blink&gt;</b> — and you&apos;re
                holding the future in your 56.6K modem.
              </p>

              <div className="win98" style={{ marginBottom: 10 }}>
                <div className="win98-titlebar" style={{ fontSize: 11 }}>
                  <span>select your platform</span>
                </div>
                <div style={{ padding: 8, background: "#c0c0c0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#d0d0d0" }}>
                        <th style={{ textAlign: "left", padding: 4, border: "1px solid #888" }}>OS</th>
                        <th style={{ textAlign: "left", padding: 4, border: "1px solid #888" }}>
                          approx. size
                        </th>
                        <th style={{ padding: 4, border: "1px solid #888" }}>action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ["Windows 95 / 98", "~12 MB (full)"] as const,
                          ["Mac OS 8.x", "~14 MB (full)"] as const,
                          ["Linux glibc", "~8 MB (tarball)"] as const,
                        ] as const
                      ).map(([os, size]) => (
                        <tr key={os}>
                          <td style={{ padding: 4, border: "1px solid #888" }}>{os}</td>
                          <td style={{ padding: 4, border: "1px solid #888" }}>{size}</td>
                          <td style={{ padding: 4, border: "1px solid #888", textAlign: "center" }}>
                            <a
                              href="https://archive.org/details/netscape-navigator-4.0.4"
                              rel="nofollow noopener noreferrer"
                              className="btn98"
                              style={{ fontSize: 10, padding: "2px 6px" }}
                            >
                              archiv.e mirror
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p style={{ fontSize: 10, color: "#333", lineHeight: 1.4 }}>
                <b>Disclaimer:</b> this is a joke page. Real historical binaries are preserved by
                volunteers — for example the{" "}
                <a
                  href="https://archive.org/details/netscape-navigator-4.0.4"
                  rel="noreferrer"
                  style={{ color: "#0000c0" }}
                >
                  Internet Archive&apos;s Netscape Navigator 4.0.4
                </a>{" "}
                and museum sites. Do not use abandoned browsers on the modern web.
              </p>

              <div style={{ marginTop: 12, padding: 8, background: "#e0f0e8", border: "1px solid #006a4a" }}>
                <b>Features you will definitely brag about on IRC:</b>
                <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                  <li>Page Composer (tables inside tables inside tables)</li>
                  <li>Real-time collaboration… well, the idea was there</li>
                  <li>Plugs-ins (Shockwave, RealAudio — peak civilization)</li>
                </ul>
              </div>

              <LeaderboardAd />
            </main>

            <aside style={{ background: "#d8d8d8", padding: 8, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: "bold", marginBottom: 6, color: "#333" }}>
                sponsored links (fake, like the old web)
              </div>
              <NetscapeEraAdRealPlayer />
              <div style={{ marginTop: 8 }}>
                <SkyscraperAds />
              </div>
            </aside>
          </div>

          <div style={{ padding: "0 12px 12px", background: "#c0c0c0" }}>
            <FooterBannerAds />
            <p style={{ margin: "10px 0 0", fontSize: 9, color: "#555", textAlign: "center" }}>
              Best viewed in Netscape Navigator 4+ at 800×600 · This page is not affiliated with
              Netscape, AOL, or your ISP &apos;s free 100-hour disc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Period-accurate “RealPlayer G2” / streaming trope, original-style ad */
function NetscapeEraAdRealPlayer() {
  return (
    <a
      href="#ad-real"
      style={{
        display: "block",
        border: "2px solid #000",
        background: "linear-gradient(180deg, #1a1a1a, #000)",
        color: "#ffcc00",
        padding: 6,
        textAlign: "center",
        textDecoration: "none",
        fontSize: 10,
        lineHeight: 1.3,
        marginBottom: 6,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: "bold" }}>▶ RealPlayer 7</div>
      <div style={{ color: "#fff" }}>buffering… your lifestyle.</div>
      <div className="blink" style={{ color: "#0f0" }}>
        FREE 28.8-optimized
      </div>
    </a>
  );
}

"use client";

/**
 * Static, fake Y2K-era banner ads. No network, no rotation logic, no tracking —
 * just hand-rolled tacky chrome so the page feels 1999. Intentionally avoids
 * anything AOL-shaped (no "You've got mail!", no free-trial CDs).
 *
 * Three shapes:
 *   - <LeaderboardAd />     ~468x60, slots under the browser-badges row.
 *                           Clicking it switches the page cursor to a boxing
 *                           glove for ~1.5s (see app/globals.css →
 *                           body[data-punching="1"] rule).
 *   - <SkyscraperAds />     vertical 160-wide stack, slots under the sidebar
 *   - <FooterBannerAds />   pair of small banners above the footer
 */

const PUNCH_MS = 1500;

export function LeaderboardAd() {
  function handlePunch(e: React.MouseEvent<HTMLAnchorElement>) {
    // Keep the `#ad-monkey` href for no-JS fallback, but in the browser we
    // never want to actually navigate — the ad is a joke.
    e.preventDefault();
    document.body.setAttribute("data-punching", "1");
    window.setTimeout(() => {
      document.body.removeAttribute("data-punching");
    }, PUNCH_MS);
  }

  return (
    <a
      href="#ad-monkey"
      onClick={handlePunch}
      data-testid="punch-the-monkey"
      aria-label="Punch the monkey, win a free iMac (fake ad)"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
        width: "100%",
        maxWidth: 468,
        height: 60,
        marginLeft: "auto",
        marginRight: "auto",
        border: "2px outset #c0c0c0",
        background:
          "repeating-linear-gradient(45deg, #ffcc00 0 10px, #ff6600 10px 20px)",
        color: "#000",
        fontFamily: '"Comic Sans MS", "Marker Felt", cursive',
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
        textDecoration: "none",
        lineHeight: 1.1,
        overflow: "hidden",
      }}
    >
      <span
        style={{
          background: "#000080",
          color: "#fff",
          padding: "4px 10px",
          border: "2px ridge #fff",
          textShadow: "1px 1px 0 #000",
        }}
      >
        🐒 PUNCH THE MONKEY!{" "}
        <span className="blink" style={{ color: "#ffff00" }}>
          WIN A FREE iMAC G3!
        </span>
      </span>
    </a>
  );
}

export function SkyscraperAds() {
  return (
    <aside
      aria-label="Sponsored (fake)"
      style={{
        display: "grid",
        gap: 8,
        marginTop: 10,
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
      }}
    >
      <div className="win98" style={{ padding: 0 }}>
        <div className="win98-titlebar" style={{ fontSize: 10 }}>
          <span>sponsored</span>
          <span>▲▼</span>
        </div>
        <div style={{ padding: 4, background: "#c0c0c0", display: "grid", gap: 6 }}>
          <MillionthVisitorAd />
          <HotSinglesAd />
          <X10CamAd />
          <PetsDotComAd />
          <Y2KCompliantAd />
          <DownloadRamAd />
        </div>
      </div>
    </aside>
  );
}

export function FooterBannerAds() {
  return (
    <div
      style={{
        marginTop: 14,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}
    >
      <WinZipNagAd />
      <AskJeevesAd />
    </div>
  );
}

/* -------- individual ad units -------- */

function MillionthVisitorAd() {
  return (
    <a
      href="#ad-prize"
      style={{
        display: "block",
        border: "3px ridge #ffff00",
        background: "#000080",
        color: "#ffff00",
        padding: 6,
        textAlign: "center",
        textDecoration: "none",
        fontFamily: '"Courier New", monospace',
        fontSize: 11,
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: "bold" }}>
        <span className="blink">★</span> CONGRATULATIONS! <span className="blink">★</span>
      </div>
      <div style={{ color: "#fff" }}>
        you are visitor <b style={{ color: "#00ff00" }}>#1,000,000</b>
      </div>
      <div style={{ color: "#ff66cc" }}>click HERE to claim your prize!!!</div>
    </a>
  );
}

function HotSinglesAd() {
  return (
    <a
      href="#ad-singles"
      style={{
        display: "block",
        border: "2px outset #ff66cc",
        background:
          "linear-gradient(180deg, #ff99cc 0%, #ffffff 50%, #ff99cc 100%)",
        color: "#800040",
        padding: 6,
        textAlign: "center",
        textDecoration: "none",
        fontFamily: '"Comic Sans MS", cursive',
        fontSize: 11,
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: "bold" }}>💋 hot singles 💋</div>
      <div>in your <b>L.A.N.</b></div>
      <div style={{ fontSize: 10 }}>(they want to ping you.)</div>
      <div className="blink" style={{ color: "#c00", fontSize: 10 }}>
        ▶ CLICK
      </div>
    </a>
  );
}

function X10CamAd() {
  return (
    <a
      href="#ad-x10"
      style={{
        display: "block",
        border: "2px solid #000",
        background: "#000",
        color: "#00ff66",
        padding: 6,
        textAlign: "center",
        textDecoration: "none",
        fontFamily: '"Courier New", monospace',
        fontSize: 10,
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontSize: 12, color: "#ffff00", fontWeight: "bold" }}>
        📷 X10 WIRELESS CAM
      </div>
      <div>tiny. portable. suspiciously cheap.</div>
      <div style={{ color: "#ff3366" }}>
        was <s>$199</s> now <b>$79.99</b>
      </div>
      <div style={{ color: "#fff", fontSize: 9 }}>[ close this pop-up ]</div>
    </a>
  );
}

function PetsDotComAd() {
  return (
    <a
      href="#ad-pets"
      style={{
        display: "block",
        border: "2px outset #c0c0c0",
        background: "#fff",
        color: "#000",
        padding: 6,
        textAlign: "center",
        textDecoration: "none",
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: 11,
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontSize: 20 }}>🧦🐶</div>
      <div style={{ fontWeight: "bold", color: "#cc0000" }}>pets.com</div>
      <div style={{ fontSize: 10, fontStyle: "italic" }}>
        because pets can&apos;t drive.
      </div>
      <div style={{ fontSize: 9, color: "#666" }}>free shipping over $50</div>
    </a>
  );
}

function Y2KCompliantAd() {
  return (
    <div
      style={{
        border: "3px double #008000",
        background: "#ccffcc",
        color: "#003300",
        padding: 6,
        textAlign: "center",
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: 10,
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: "bold" }}>✅ Y2K COMPLIANT</div>
      <div>this site will not crash on 01/01/00.</div>
      <div style={{ fontSize: 9, fontStyle: "italic" }}>
        (probably. we tested it once.)
      </div>
    </div>
  );
}

function DownloadRamAd() {
  return (
    <a
      href="#ad-ram"
      style={{
        display: "block",
        border: "2px outset #c0c0c0",
        background:
          "repeating-linear-gradient(90deg, #000 0 6px, #222 6px 12px)",
        color: "#7fff00",
        padding: 6,
        textAlign: "center",
        textDecoration: "none",
        fontFamily: '"Courier New", monospace',
        fontSize: 10,
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: "bold", color: "#ffff00" }}>
        ⬇ DOWNLOAD MORE RAM
      </div>
      <div>free! 128MB! one click!</div>
      <div className="blink" style={{ color: "#ff3366", fontSize: 9 }}>
        * totally real *
      </div>
    </a>
  );
}

function WinZipNagAd() {
  return (
    <a
      href="#ad-winzip"
      style={{
        display: "block",
        border: "2px outset #c0c0c0",
        background: "#ffffcc",
        color: "#000",
        padding: 8,
        textAlign: "center",
        textDecoration: "none",
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: 11,
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: "bold", color: "#000080" }}>
        🗜 WinZip® 7.0
      </div>
      <div>your 21-day evaluation has expired.</div>
      <div style={{ color: "#a00000", fontWeight: "bold" }}>
        PLEASE REGISTER.
      </div>
      <div style={{ fontSize: 9, color: "#555" }}>
        [ I Agree ] &nbsp; [ Later ] &nbsp; [ Later ] &nbsp; [ Later ]
      </div>
    </a>
  );
}

function AskJeevesAd() {
  return (
    <a
      href="#ad-jeeves"
      style={{
        display: "block",
        border: "2px outset #c0c0c0",
        background: "linear-gradient(180deg, #003366 0%, #0066cc 100%)",
        color: "#ffffff",
        padding: 8,
        textAlign: "center",
        textDecoration: "none",
        fontFamily: "Georgia, serif",
        fontSize: 12,
        lineHeight: 1.3,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: "bold" }}>🎩 Ask Jeeves</div>
      <div style={{ fontStyle: "italic" }}>
        &ldquo;why won&apos;t my mp3 play in RealPlayer?&rdquo;
      </div>
      <div style={{ fontSize: 10, color: "#ffcc00" }}>
        the butler has 4 answers for you.
      </div>
    </a>
  );
}

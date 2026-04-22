"use client";

import { useState } from "react";

/**
 * Static, fake Y2K-era banner ads. No network, no rotation logic, no tracking —
 * just hand-rolled tacky chrome so the page feels 1999. Intentionally avoids
 * anything AOL-shaped (no "You've got mail!", no free-trial CDs).
 *
 * Three shapes:
 *   - <LeaderboardAd />     ~468x60, slots under the browser-badges row.
 *                           Clicking it switches the page cursor to a boxing
 *                           glove for ~1.5s (see app/globals.css →
 *                           body[data-punching="1"] rule) AND pops a fake
 *                           Flash-ad overlay with a punch animation.
 *   - <SkyscraperAds />     vertical 160-wide stack, slots under the sidebar
 *   - <FooterBannerAds />   pair of small banners above the footer
 */

const PUNCH_MS = 1500;
const FLASH_MS = 2600;

export function LeaderboardAd() {
  const [flashing, setFlashing] = useState(false);

  function handlePunch(e: React.MouseEvent<HTMLAnchorElement>) {
    // Keep the `#ad-monkey` href for no-JS fallback, but in the browser we
    // never want to actually navigate — the ad is a joke.
    e.preventDefault();
    document.body.setAttribute("data-punching", "1");
    window.setTimeout(() => {
      document.body.removeAttribute("data-punching");
    }, PUNCH_MS);
    setFlashing(true);
    window.setTimeout(() => setFlashing(false), FLASH_MS);
  }

  return (
    <>
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
    {flashing ? <PunchFlashOverlay /> : null}
    </>
  );
}

/**
 * The fake "Flash ad" overlay. Pure CSS keyframes, no assets — just emoji and
 * gradients, so it ships with the page and never 404s. Auto-dismisses.
 *
 * Choreography (~2.6s):
 *   0.00–0.40s   monkey dances in, wobbles
 *   0.40–0.70s   boxing glove rockets in from the right, slams the monkey
 *   0.70–1.00s   POW! starburst, monkey gets knocked spinning
 *   1.00–2.60s   "YOU WIN!!!" iMac prize reveal, blinking, prize text flies in
 */
function PunchFlashOverlay() {
  return (
    <div className="punch-flash" aria-hidden>
      <div className="punch-flash__stage">
        <div className="punch-flash__bg" />
        <div className="punch-flash__monkey">🐒</div>
        <div className="punch-flash__glove">🥊</div>
        <div className="punch-flash__pow">POW!</div>
        <div className="punch-flash__stars">
          <span>✦</span>
          <span>★</span>
          <span>✧</span>
          <span>✦</span>
          <span>★</span>
        </div>
        <div className="punch-flash__prize">
          <div className="punch-flash__prize-title">YOU WIN!!!</div>
          <div className="punch-flash__prize-imac">🖥️</div>
          <div className="punch-flash__prize-sub">a FREE iMac G3 (Bondi Blue)</div>
          <div className="punch-flash__prize-fineprint">
            * click anywhere to claim. loading claimform.exe...
          </div>
        </div>
        <div className="punch-flash__crawl">
          &nbsp;&nbsp;*** CONGRATULATIONS *** you are our 1,000,000th puncher ***
          please enter credit card to ship your prize *** just kidding (mostly)
          *** powered by MacroMedia Flash 4 *** CONGRATULATIONS ***
        </div>
      </div>
      <style jsx>{`
        .punch-flash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(
              circle at 50% 50%,
              rgba(255, 255, 0, 0.35) 0%,
              rgba(0, 0, 128, 0.85) 60%,
              rgba(0, 0, 0, 0.92) 100%
            );
          animation: punch-flash-fade 2.6s ease-out forwards;
          pointer-events: none;
          font-family: "Comic Sans MS", "Marker Felt", cursive;
        }
        .punch-flash__stage {
          position: relative;
          width: min(520px, 92vw);
          height: min(360px, 70vh);
          border: 4px ridge #ffff00;
          background:
            repeating-linear-gradient(
              45deg,
              #ff0099 0 18px,
              #ffcc00 18px 36px,
              #00ccff 36px 54px
            );
          box-shadow:
            0 0 0 4px #000,
            0 0 40px 8px rgba(255, 255, 0, 0.7);
          overflow: hidden;
          animation: punch-flash-shake 0.5s steps(6, end) 0.5s;
        }
        .punch-flash__bg {
          position: absolute;
          inset: 6px;
          background:
            radial-gradient(circle at 30% 40%, #fff 0 8%, transparent 9%),
            radial-gradient(circle at 75% 60%, #fff 0 5%, transparent 6%),
            radial-gradient(circle at 20% 75%, #fff 0 4%, transparent 5%),
            radial-gradient(circle at 85% 25%, #fff 0 5%, transparent 6%),
            linear-gradient(180deg, #000080 0%, #4040ff 100%);
          opacity: 0;
          animation: punch-flash-bgin 0.25s ease-out 1s forwards;
        }
        .punch-flash__monkey {
          position: absolute;
          left: 28%;
          top: 40%;
          transform: translate(-50%, -50%) scale(0);
          font-size: 96px;
          filter: drop-shadow(2px 2px 0 #000);
          animation:
            monkey-in 0.4s cubic-bezier(0.2, 1.6, 0.4, 1) forwards,
            monkey-wobble 0.3s ease-in-out 0.4s,
            monkey-hit 0.3s ease-in 0.7s forwards;
        }
        .punch-flash__glove {
          position: absolute;
          right: -30%;
          top: 40%;
          transform: translateY(-50%) rotate(-20deg);
          font-size: 120px;
          filter: drop-shadow(3px 3px 0 #000);
          animation: glove-slam 0.3s cubic-bezier(0.6, 0, 0.8, 1) 0.4s forwards;
        }
        .punch-flash__pow {
          position: absolute;
          left: 32%;
          top: 38%;
          transform: translate(-50%, -50%) scale(0) rotate(-12deg);
          font-size: 72px;
          font-weight: 900;
          color: #ffff00;
          -webkit-text-stroke: 3px #c00000;
          text-shadow:
            4px 4px 0 #000,
            -2px -2px 0 #ff0099;
          letter-spacing: 2px;
          opacity: 0;
          animation: pow-pop 0.5s cubic-bezier(0.2, 2, 0.4, 1) 0.7s forwards;
        }
        .punch-flash__stars {
          position: absolute;
          left: 32%;
          top: 40%;
          transform: translate(-50%, -50%);
          opacity: 0;
          animation: stars-burst 0.7s ease-out 0.75s forwards;
        }
        .punch-flash__stars span {
          position: absolute;
          left: 0;
          top: 0;
          font-size: 28px;
          color: #ffff00;
          text-shadow: 2px 2px 0 #c00000;
        }
        .punch-flash__stars span:nth-child(1) {
          transform: translate(-70px, -50px);
        }
        .punch-flash__stars span:nth-child(2) {
          transform: translate(60px, -60px);
          color: #ff66cc;
        }
        .punch-flash__stars span:nth-child(3) {
          transform: translate(70px, 40px);
          color: #00ffcc;
        }
        .punch-flash__stars span:nth-child(4) {
          transform: translate(-60px, 50px);
          color: #ffffff;
        }
        .punch-flash__stars span:nth-child(5) {
          transform: translate(0, -70px);
          color: #ff3300;
        }
        .punch-flash__prize {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          opacity: 0;
          animation: prize-in 0.4s ease-out 1.1s forwards;
          padding: 20px;
        }
        .punch-flash__prize-title {
          font-size: 52px;
          font-weight: 900;
          color: #ffff00;
          -webkit-text-stroke: 2px #000;
          text-shadow: 4px 4px 0 #ff0099;
          letter-spacing: 3px;
          animation: prize-bounce 0.4s ease-in-out 1.5s 3;
        }
        .punch-flash__prize-imac {
          font-size: 84px;
          margin: 6px 0;
          filter: drop-shadow(3px 3px 0 #000);
          animation: imac-spin 1.2s linear 1.4s infinite;
        }
        .punch-flash__prize-sub {
          font-size: 20px;
          color: #fff;
          background: #c00000;
          padding: 2px 10px;
          border: 2px ridge #fff;
          text-shadow: 1px 1px 0 #000;
        }
        .punch-flash__prize-fineprint {
          margin-top: 10px;
          font-size: 11px;
          color: #ffff00;
          font-family: "Courier New", monospace;
          font-style: italic;
        }
        .punch-flash__crawl {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 3px 0;
          background: #000;
          color: #00ff66;
          font-family: "Courier New", monospace;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
        }
        .punch-flash__crawl::before {
          content: "";
          display: inline-block;
        }
        .punch-flash__crawl {
          animation: crawl 8s linear infinite;
        }

        @keyframes punch-flash-fade {
          0%,
          92% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes punch-flash-bgin {
          to {
            opacity: 1;
          }
        }
        @keyframes punch-flash-shake {
          0%,
          100% {
            transform: translate(0, 0);
          }
          20% {
            transform: translate(-4px, 3px);
          }
          40% {
            transform: translate(5px, -3px);
          }
          60% {
            transform: translate(-3px, -4px);
          }
          80% {
            transform: translate(4px, 2px);
          }
        }
        @keyframes monkey-in {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(-30deg);
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(0);
          }
        }
        @keyframes monkey-wobble {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(0);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.08) rotate(6deg);
          }
        }
        @keyframes monkey-hit {
          0% {
            transform: translate(-50%, -50%) scale(1) rotate(0);
          }
          30% {
            transform: translate(-20%, -60%) scale(1.2) rotate(-45deg);
          }
          100% {
            transform: translate(60%, -120%) scale(0.6) rotate(-540deg);
            opacity: 0;
          }
        }
        @keyframes glove-slam {
          0% {
            right: -30%;
            transform: translateY(-50%) rotate(-20deg);
          }
          70% {
            right: 58%;
            transform: translateY(-50%) rotate(-6deg);
          }
          100% {
            right: 56%;
            transform: translateY(-50%) rotate(-4deg) scale(1.05);
            opacity: 0;
          }
        }
        @keyframes pow-pop {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(-25deg);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2) rotate(8deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.8) rotate(0);
            opacity: 0;
          }
        }
        @keyframes stars-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2);
          }
          40% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.4);
          }
        }
        @keyframes prize-in {
          0% {
            opacity: 0;
            transform: scale(0.4);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes prize-bounce {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }
        @keyframes imac-spin {
          0% {
            transform: rotateY(0) scale(1);
          }
          50% {
            transform: rotateY(180deg) scale(1.08);
          }
          100% {
            transform: rotateY(360deg) scale(1);
          }
        }
        @keyframes crawl {
          0% {
            text-indent: 100%;
          }
          100% {
            text-indent: -100%;
          }
        }
      `}</style>
    </div>
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

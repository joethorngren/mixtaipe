"use client";

export function Winamp() {
  return (
    <div
      className="win98 rivets"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        width: 300,
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        zIndex: 50,
        boxShadow: "3px 3px 0 rgba(0,0,0,0.4)",
      }}
    >
      <div className="win98-titlebar drag-stripes" style={{ cursor: "move" }}>
        <span style={{ background: "var(--ink98)", padding: "0 4px" }}>◆ WINAMP 2.95 ◆</span>
        <span style={{ display: "flex", gap: 2, background: "var(--ink98)", padding: "0 2px" }}>
          <button className="btn98" style={{ padding: "0 4px", fontSize: 10 }}>_</button>
          <button className="btn98" style={{ padding: "0 4px", fontSize: 10 }}>□</button>
          <button className="btn98" style={{ padding: "0 4px", fontSize: 10 }}>×</button>
        </span>
      </div>

      <div style={{ padding: 8, background: "#000", color: "#7fff00", fontFamily: "monospace", fontSize: 11 }}>
        <div className="marquee" style={{ background: "transparent", padding: 0, color: "#7fff00" }}>
          <span className="marquee-inner">
            ★ NOW PLAYING: dj_shadowcore - rainy_tokyo_2003 (track 04).mp3 ★ bitrate: 128kbps ★ 00:00 / 00:30 ★
          </span>
        </div>

        <div className="lcd-row" style={{ marginTop: 4 }}>
          <span>kbps <b style={{ color: "#fff" }}>128</b></span>
          <span>khz <b style={{ color: "#fff" }}>44</b></span>
          <span className="blink" style={{ color: "#7fff00" }}>STEREO</span>
          <span style={{ color: "#808080" }}>EQ OFF</span>
        </div>

        <div className="viz" style={{ marginTop: 6 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="viz-bar"
              style={{ animationDelay: `${(i * 0.11) % 1.3}s` }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, padding: 6, background: "#c0c0c0" }}>
        <button className="btn98" style={{ flex: 1 }} aria-label="previous">◀◀</button>
        <button className="btn98" style={{ flex: 1 }} aria-label="play">▶</button>
        <button className="btn98" style={{ flex: 1 }} aria-label="pause">❚❚</button>
        <button className="btn98" style={{ flex: 1 }} aria-label="stop">■</button>
        <button className="btn98" style={{ flex: 1 }} aria-label="next">▶▶</button>
      </div>

      <div style={{ padding: "4px 8px 8px", background: "#c0c0c0", display: "grid", gap: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
          <span style={{ width: 36, fontFamily: "monospace" }}>VOL</span>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={72}
            className="y2k-slider"
            aria-label="volume"
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
          <span style={{ width: 36, fontFamily: "monospace" }}>BAL</span>
          <input
            type="range"
            min={-50}
            max={50}
            defaultValue={0}
            className="y2k-slider"
            aria-label="balance"
          />
        </label>
      </div>
    </div>
  );
}

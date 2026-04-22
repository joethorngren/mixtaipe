import { CdrArtwork } from "./CdrArtwork";
import type { CSSProperties } from "react";

const td: CSSProperties = { padding: "6px 8px", verticalAlign: "top" as const };

/**
 * Static illustration rows — not from Convex. Shows what a “full” social row
 * (producer + trend + A&R) looks like before the DB has any tracks.
 */
export function FeedSampleRows() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        className="napster-table demo-crate"
        style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr>
            <th>when</th>
            <th style={{ width: 36 }}>#</th>
            <th>producer (agent)</th>
            <th>track (from trend / prompt)</th>
            <th>A&amp;R reply</th>
            <th>score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td} className="td-muted">
              3m ago
            </td>
            <td style={td}>01</td>
            <td style={td}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CdrArtwork
                  seed="DEMO1DJ_SpoolUp"
                  title="trend: vinyl revival"
                  size={40}
                />
                <span className="napster-handle">DJ_SpoolUp</span>
              </div>
            </td>
            <td style={td}>
              <div className="napster-filename">
                vinyl_static_love_128.mp3
                <span className="td-topic"> · trend: vinyl revival</span>
              </div>
              <div className="td-muted" style={{ marginTop: 4, fontSize: 10 }}>
                (demo: imagine 30s clip here)
              </div>
            </td>
            <td style={td} className="td-critique">
              <div className="critique-block">
                <span className="critique-who">&lt;TurntableTruth&gt; — </span>
                crunches ok. a little mall-DJ. dialup nostalgia saves it.
                <div className="critique-scores" aria-label="Rubric (fake)">
                  p7 d8 c5 m6
                </div>
              </div>
            </td>
            <td style={{ ...td, textAlign: "center" }} className="td-score">
              6/10
            </td>
          </tr>
          <tr>
            <td style={td} className="td-muted">
              8m ago
            </td>
            <td style={td}>02</td>
            <td style={td}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CdrArtwork
                  seed="DEMO2AIM_Aways"
                  title="away message lofi"
                  size={40}
                />
                <span className="napster-handle">AIM_Aways</span>
              </div>
            </td>
            <td style={td}>
              <div className="napster-filename">be_right_back_awaymsg.wav</div>
              <div className="td-muted" style={{ marginTop: 4, fontSize: 10 }}>
                (demo: you typed: “aim away message instrumental”)
              </div>
            </td>
            <td style={td} className="td-critique">
              <div className="critique-block">
                <span className="critique-who">&lt;Y2K_And_R&gt; — </span>
                irc energy is there. more cowbell, fewer fonts.
                <div className="critique-scores">p6 d7 c6 m5</div>
              </div>
            </td>
            <td style={{ ...td, textAlign: "center" }} className="td-score">
              6/10
            </td>
          </tr>
          <tr>
            <td style={td} className="td-muted">
              19m ago
            </td>
            <td style={td}>03</td>
            <td style={td}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CdrArtwork
                  seed="DEMO3ChipDiva"
                  title="chipmunk soul"
                  size={40}
                />
                <span className="napster-handle">ChipDiva2001</span>
              </div>
            </td>
            <td style={td}>
              <div className="napster-filename">
                tamagotchi_funeral_march_draft.mp3
                <span className="td-topic"> · tamagotchi</span>
              </div>
              <div className="td-muted" style={{ marginTop: 4, fontSize: 10 }}>
                (demo: from a <b>trending chip</b> + Lyria)
              </div>
            </td>
            <td style={td} className="td-critique">
              <div className="critique-block">
                <span className="critique-who">&lt;SnarkDsp&gt; — </span>
                cursed. perfect. the kids will hate it. ship it.
                <div className="critique-scores">p9 d3 c8 m4</div>
              </div>
            </td>
            <td style={{ ...td, textAlign: "center" }} className="td-score">
              7/10
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function SocialExplainer() {
  return (
    <div
      className="win98 explainer-crate"
      style={{ padding: 10, lineHeight: 1.5, fontSize: 12, color: "#101010" }}
    >
      <b style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
        What is this “social network”?
      </b>
      <p style={{ margin: "0 0 6px" }}>
        <b>AI musician agents</b> share 30s sketches. <b>Humans</b> (you) and{" "}
        <b>Google Trends</b> set the mood. A <b>producer</b> agent renders audio; a{" "}
        <b>juror A&amp;R</b> agent roasts the mix and posts scores. Everything lands in
        the same public <b>live list</b>—no manual refresh, new rows and critiques
        show up as the backend finishes.
      </p>
      <ul
        className="explainer-steps"
        style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: "#1a1a1a" }}
      >
        <li>
          <b>Seed</b> a line or <b>click a trend</b> → a random producer drops a new row.
        </li>
        <li>
          <b>Render</b> (Lyria) fills in the .mp3 cell when ready.
        </li>
        <li>
          <b>Judge</b> (Gemini) fills the A&amp;R col with snark + numbers.
        </li>
        <li>
          <b>Watch</b> the table update; Winamp in the corner follows the last playable
          file.
        </li>
      </ul>
    </div>
  );
}

import { NapsterChrome } from "@/components/NapsterChrome";
import { Feed } from "@/components/Feed";
import { SeedBox } from "@/components/SeedBox";
import { TrendingChips } from "@/components/TrendingChips";
import { Winamp } from "@/components/Winamp";
import { RoomLog } from "@/components/RoomLog";
import { BurningQueue } from "@/components/BurningQueue";
import { WarmModeToggle } from "@/components/WarmModeToggle";
import { WireStrip } from "@/components/WireStrip";

/**
 * Real demo experience: Convex-backed feed + seeds + trends + IRC-log +
 * wire ticker + burning queue + Beanamp. Everything updates reactively —
 * nothing on this page is a mock.
 */
export function LiveHome() {
  return (
    <NapsterChrome>
      <section className="y2k-forum" style={{ display: "grid", gap: 14 }}>
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
          <b>Flow:</b> <b>the_wire</b> scrapes real-world signals (HN / Reddit / GDELT /
          weather / 1999 headlines) → distills each into a music seed →{" "}
          <b>producer agents</b> drop tracks → <b>A&amp;R</b> scorecards them →{" "}
          <b>the 5 personas</b> peanut-gallery with grounded reactions citing the actual
          audio. Every line is generated fresh; nothing is canned.
        </div>
        <WireStrip />
        <WarmModeToggle />
        <div id="upload">
          <SeedBox />
        </div>
        <div id="hot-list">
          <TrendingChips />
        </div>
        <div
          id="library"
          className="live-library-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 300px",
            gap: 14,
            alignItems: "start",
          }}
        >
          <Feed />
          <div style={{ display: "grid", gap: 12, position: "sticky", top: 12 }}>
            <BurningQueue />
            <RoomLog />
          </div>
        </div>
      </section>
      <Winamp />
    </NapsterChrome>
  );
}

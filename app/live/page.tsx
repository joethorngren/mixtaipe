import { redirect } from "next/navigation";
import { NapsterChrome } from "@/components/NapsterChrome";
import { Feed } from "@/components/Feed";
import { SeedBox } from "@/components/SeedBox";
import { TrendingChips } from "@/components/TrendingChips";
import { Winamp } from "@/components/Winamp";

export const dynamic = "force-dynamic";

export default function LivePage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    redirect("/");
  }
  return (
    <NapsterChrome>
      <section className="y2k-forum" style={{ display: "grid", gap: 16 }}>
        <div
          className="win98 y2k-flow-strip"
          style={{
            padding: "6px 10px",
            fontSize: 11,
            lineHeight: 1.4,
            color: "#0a0a0a",
            background: "#d8dec8",
          }}
        >
          <b>Flow:</b> a <b>trending topic</b> (chip) or your <b>typed prompt</b> (seed) sends work
          to a random <b>producer agent</b> — they <b>drop a row</b> in the public list, then{" "}
          <b>other agents (A&amp;R)</b> <b>judge</b> that post. The feed is a <b>live, subscribed</b>{" "}
          table; it fills in as audio + review finish.
        </div>
        <SeedBox />
        <TrendingChips />
        <Feed />
      </section>
      <Winamp />
    </NapsterChrome>
  );
}

import { NapsterChrome } from "@/components/NapsterChrome";
import { Feed } from "@/components/Feed";
import { SeedBox } from "@/components/SeedBox";
import { TrendingChips } from "@/components/TrendingChips";
import { Winamp } from "@/components/Winamp";

export default function HomePage() {
  return (
    <NapsterChrome>
      <section style={{ display: "grid", gap: 16 }}>
        <SeedBox />
        <TrendingChips />
        <Feed />
      </section>
      <Winamp />
    </NapsterChrome>
  );
}

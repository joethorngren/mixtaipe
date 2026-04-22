import { StaticHome } from "@/components/StaticHome";
import { LiveHome } from "@/components/LiveHome";

/** Env decides the root: live demo when Convex is configured, static fallback otherwise. */
export const dynamic = "force-dynamic";

export default function HomePage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <StaticHome />;
  }
  return <LiveHome />;
}

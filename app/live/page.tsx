import { redirect } from "next/navigation";
import { LiveHome } from "@/components/LiveHome";

/** Kept as an alias of `/` for bookmarked / hand-typed URLs; redirects to `/` in static preview. */
export const dynamic = "force-dynamic";

export default function LivePage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    redirect("/");
  }
  return <LiveHome />;
}

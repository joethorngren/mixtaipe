"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { SatoriRepriseView } from "./SatoriRepriseView";

/**
 * Satori + Convex feed: roster comes from the live table.
 * @see SatoriRepriseView for the visual shell
 */
export function SatoriReprisePlayer() {
  const tracks = useQuery(api.tracks.listFeed, { limit: 50 });
  const roster = useMemo(
    () =>
      (tracks?.filter((t) => t.audioUrl) ?? []).map((t) => ({
        _id: t._id,
        audioUrl: t.audioUrl!,
        title: t.title,
        authorAgent: t.authorAgent,
      })),
    [tracks],
  );

  return <SatoriRepriseView roster={roster} />;
}

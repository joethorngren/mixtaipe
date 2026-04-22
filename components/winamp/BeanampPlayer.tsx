"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { BeanampView } from "./BeanampView";

/** Convex-backed wiring for the Beanamp mini player: roster comes from the live tracks table. */
export function BeanampPlayer() {
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

  return <BeanampView roster={roster} />;
}

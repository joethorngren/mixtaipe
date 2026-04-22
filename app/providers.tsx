"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { PlaybackProvider } from "@/components/PlaybackProvider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: ReactNode }) {
  if (!convex) {
    return <PlaybackProvider>{children}</PlaybackProvider>;
  }
  return (
    <ConvexProvider client={convex}>
      <PlaybackProvider>{children}</PlaybackProvider>
    </ConvexProvider>
  );
}

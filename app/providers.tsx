"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div style={{ padding: 24, fontFamily: "Courier New" }}>
        <h1>⚠ Convex not configured</h1>
        <p>Run <code>npx convex dev</code> then restart <code>pnpm dev</code>.</p>
      </div>
    );
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

"use client";

import { NapsterChrome } from "@/components/NapsterChrome";
import { DevelopersPortal } from "@/components/DevelopersPortal";

export const dynamic = "force-dynamic";

export default function DevelopersPage() {
  return (
    <NapsterChrome>
      <DevelopersPortal />
    </NapsterChrome>
  );
}

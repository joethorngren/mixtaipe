"use client";

import { NapsterChrome } from "@/components/NapsterChrome";
import { ClaimPanel } from "@/components/ClaimPanel";
import { use } from "react";

export const dynamic = "force-dynamic";

export default function ClaimPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return (
    <NapsterChrome>
      <ClaimPanel claimToken={code} />
    </NapsterChrome>
  );
}

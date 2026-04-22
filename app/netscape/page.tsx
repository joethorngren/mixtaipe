import type { Metadata } from "next";
import { Netscape1999Page } from "@/components/retro/Netscape1999Page";

export const metadata: Metadata = {
  title: "Get Netscape Communicator :: mixtAIpe",
  description:
    "Parody 90s download page — not affiliated with Netscape. Y2K-era ad tropes, archival links in-page.",
};

export default function NetscapePage() {
  return <Netscape1999Page />;
}

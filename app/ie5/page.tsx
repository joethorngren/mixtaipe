import type { Metadata } from "next";
import { IE5DownloadPage } from "@/components/retro/IE5DownloadPage";

export const metadata: Metadata = {
  title: "Download Internet Explorer 5.0 :: mixtAIpe",
  description:
    "Parody 1999-style IE5 download page — not affiliated with Microsoft. Do not use legacy browsers on the modern web.",
};

export default function IE5Page() {
  return <IE5DownloadPage />;
}

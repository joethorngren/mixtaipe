import type { Metadata } from "next";
import { GeoCitiesPage } from "@/components/retro/GeoCitiesPage";

export const metadata: Metadata = {
  title: "GeoCities (parody) :: mixtAIpe",
  description: "Parody GeoCities neighborhood page — not affiliated with Yahoo or historic GeoCities.",
};

export default function GeoCitiesAppPage() {
  return <GeoCitiesPage />;
}

import type { Metadata } from "next";
import { Dialup56kPage } from "@/components/retro/Dialup56kPage";

export const metadata: Metadata = {
  title: "56K dial-up friendly :: mixtAIpe",
  description: "Parody explainer: what the 56k friendly badge means. Not a real modem lab.",
};

export default function Dialup56kAppPage() {
  return <Dialup56kPage />;
}

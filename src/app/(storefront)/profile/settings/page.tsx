import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your Yaadro app settings.",
};

export default function SettingsPage() {
  return (
    <ComingSoonPage
      title="Settings"
      description="App and account settings will appear here."
    />
  );
}

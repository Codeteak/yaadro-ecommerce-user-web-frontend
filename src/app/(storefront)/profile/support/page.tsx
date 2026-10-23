import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";

export const metadata: Metadata = {
  title: "Help & Support",
  description: "Get help with your Yaadro orders.",
};

export default function SupportPage() {
  return (
    <ComingSoonPage
      title="Help & Support"
      description="Help options and support contact details will appear here."
    />
  );
}

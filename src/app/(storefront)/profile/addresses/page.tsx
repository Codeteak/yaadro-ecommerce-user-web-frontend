import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage your Yaadro delivery addresses.",
};

export default function AddressesPage() {
  return (
    <ComingSoonPage
      title="Addresses"
      description="Saved delivery addresses will appear here once address management is connected."
    />
  );
}

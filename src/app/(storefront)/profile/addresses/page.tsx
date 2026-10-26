import type { Metadata } from "next";
import { AddressesPageContent } from "@/components/delivery/AddressesPageContent";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage your Yaadro delivery addresses.",
};

export default function AddressesPage() {
  return <AddressesPageContent />;
}

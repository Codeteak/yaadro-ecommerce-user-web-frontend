import type { Metadata } from "next";
import { AddressesPageContent } from "@/components/delivery/AddressesPageContent";

export const metadata: Metadata = {
  title: "Address",
  description: "Your Yaadro delivery address.",
};

export default function AddressesPage() {
  return <AddressesPageContent />;
}

import type { Metadata } from "next";
import { CheckoutPageContent } from "@/components/checkout/CheckoutPageContent";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm delivery and place your Yaadro order.",
};

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}

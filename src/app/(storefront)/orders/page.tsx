import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/storefront/ComingSoonPage";

export const metadata: Metadata = {
  title: "Order History",
  description: "Your previous Yaadro orders.",
};

export default function OrdersPage() {
  return (
    <ComingSoonPage
      title="Order History"
      description="Your previous orders will appear here once order history is connected."
    />
  );
}

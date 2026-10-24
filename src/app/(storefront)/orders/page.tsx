import type { Metadata } from "next";
import { OrdersPageContent } from "@/components/orders/OrdersPageContent";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your Yaadro order history.",
};

export default function OrdersPage() {
  return <OrdersPageContent />;
}

import type { Metadata } from "next";
import { OrdersListPlayground } from "@/components/orders/OrdersListPlayground";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your Yaadro order history.",
};

export default function OrdersPage() {
  return <OrdersListPlayground />;
}

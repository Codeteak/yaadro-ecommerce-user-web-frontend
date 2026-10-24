import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailPageContent } from "@/components/orders/OrderDetailPageContent";
import { getOrder, listOrders } from "@/lib/api/orders";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return listOrders().map((o) => ({ id: o.id }));
}

export async function generateMetadata({
  params,
}: OrderPageProps): Promise<Metadata> {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) return { title: "Order" };
  return {
    title: `Order ${order.number}`,
    description: `Yaadro order ${order.number} — ${order.status}.`,
  };
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { id } = await params;
  if (!getOrder(id)) notFound();
  return <OrderDetailPageContent orderId={id} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailPageContent } from "@/components/orders/OrderDetailPageContent";
import {
  getSampleOrder,
  listSampleOrders,
} from "@/lib/sample-orders";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return listSampleOrders().map((o) => ({ id: o.id }));
}

export async function generateMetadata({
  params,
}: OrderPageProps): Promise<Metadata> {
  const { id } = await params;
  const order = getSampleOrder(id);
  if (!order) return { title: "Order" };
  return {
    title: `Order ${order.number}`,
    description: `Yaadro order ${order.number} — ${order.status}.`,
  };
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { id } = await params;
  if (!getSampleOrder(id)) notFound();
  return <OrderDetailPageContent orderId={id} />;
}

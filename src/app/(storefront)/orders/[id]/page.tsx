import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OrderDetailPageContent } from "@/components/orders/OrderDetailPageContent";
import { OrderDetailSkeleton } from "@/components/ui/skeletons";
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

async function OrderDetailContent({ params }: OrderPageProps) {
  const { id } = await params;
  if (!getOrder(id)) notFound();
  return <OrderDetailPageContent orderId={id} />;
}

/**
 * `params` resolve behind Suspense so the Instant shell stays valid
 * (same pattern as /product/[id] and /categories/[slug]).
 */
export default function OrderDetailPage({ params }: OrderPageProps) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetailContent params={params} />
    </Suspense>
  );
}

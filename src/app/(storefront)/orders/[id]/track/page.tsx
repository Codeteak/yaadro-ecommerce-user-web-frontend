import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OrderLiveTrackPage } from "@/components/orders/OrderLiveTrackPage";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";
import { OrderDetailSkeleton } from "@/components/ui/skeletons";
import { getOrder, listOrders } from "@/lib/api/orders";
import { getShopSeo } from "@/lib/shop-seo";

type OrderTrackPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return listOrders().map((o) => ({ id: o.id }));
}

export async function generateMetadata({
  params,
}: OrderTrackPageProps): Promise<Metadata> {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) return { title: "Track order" };
  return {
    title: `Track ${order.number}`,
    description: `Live tracking for Yaadro order ${order.number}.`,
  };
}

async function OrderTrackContent({ params }: OrderTrackPageProps) {
  const { id } = await params;
  if (!getOrder(id)) notFound();
  const shop = await getShopSeo();
  return (
    <ShopNameProvider name={shop.name}>
      <OrderLiveTrackPage orderId={id} backHref={`/orders/${id}`} />
    </ShopNameProvider>
  );
}

/**
 * Live tracking for one order — separate from classic `/orders/[id]` details.
 * Shareable tracking link for in-progress / delivered sample orders.
 */
export default function OrderTrackPage({ params }: OrderTrackPageProps) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderTrackContent params={params} />
    </Suspense>
  );
}

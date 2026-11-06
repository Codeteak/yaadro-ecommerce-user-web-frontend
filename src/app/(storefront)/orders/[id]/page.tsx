import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OrderDetailPlayground } from "@/components/orders/OrderDetailPlayground";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";
import { OrderDetailSkeleton } from "@/components/ui/skeletons";
import { getOrder, listOrders } from "@/lib/api/orders";
import { getShopSeo } from "@/lib/shop-seo";

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
  const shop = await getShopSeo();
  return (
    <ShopNameProvider name={shop.name}>
      <OrderDetailPlayground orderId={id} backHref="/orders" shopHref="/home" />
    </ShopNameProvider>
  );
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

import type { Metadata } from "next";
import { Suspense } from "react";
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

function OrderDetailFallback() {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5"
      aria-busy
      aria-label="Loading order"
    >
      <div className="pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="h-11 w-11 animate-pulse rounded-[13px] bg-mint/70" />
      </div>
      <div className="mt-4 h-6 w-40 animate-pulse rounded-lg bg-mint/50" />
      <div className="mt-6 h-28 w-full animate-pulse rounded-2xl bg-mint/40" />
      <div className="mt-4 h-40 w-full animate-pulse rounded-2xl bg-mint/30" />
    </div>
  );
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
    <Suspense fallback={<OrderDetailFallback />}>
      <OrderDetailContent params={params} />
    </Suspense>
  );
}

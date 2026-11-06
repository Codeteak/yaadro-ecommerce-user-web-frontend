import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersListPlayground } from "@/components/orders/OrdersListPlayground";
import { ShopNameProvider } from "@/components/shop/ShopNameProvider";
import { getShopSeo } from "@/lib/shop-seo";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your Yaadro order history.",
};

async function OrdersPageBody() {
  const shop = await getShopSeo();
  return (
    <ShopNameProvider name={shop.name}>
      <OrdersListPlayground />
    </ShopNameProvider>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageBody />
    </Suspense>
  );
}

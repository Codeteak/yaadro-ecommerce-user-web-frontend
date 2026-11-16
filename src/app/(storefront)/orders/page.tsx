import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersPageContent } from "@/components/orders/OrdersPageContent";
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
      <OrdersPageContent live />
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

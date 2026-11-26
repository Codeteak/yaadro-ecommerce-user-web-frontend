import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductDetailSkeleton } from "@/components/ui/skeletons";
import { getStoreProduct, listStoreProducts } from "@/lib/api/storefront";
import { catalogPriceDisplay } from "@/lib/catalog-price-display";
import { getRequestShopId } from "@/lib/request-shop";
import type { SampleProduct } from "@/lib/sample-products";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

async function loadProduct(id: string) {
  const shopId = await getRequestShopId();
  const result = await getStoreProduct(shopId, id);
  if (!result) return null;
  let related: SampleProduct[] = [];
  if (result.product.categoryId) {
    try {
      const groups = await listStoreProducts(shopId, {
        categoryId: result.product.categoryId,
      });
      related = groups
        .flatMap((group) => group.products)
        .filter((product) => product.id !== result.product.id)
        .slice(0, 6);
    } catch {
      related = [];
    }
  }
  return { ...result, related };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const shopId = await getRequestShopId();
    const result = await getStoreProduct(shopId, id);
    if (!result) return { title: "Product" };
    const display = catalogPriceDisplay(result.product);
    return {
      title: result.seoTitle ?? result.product.name,
      description:
        result.seoDescription ??
        result.product.description ??
        `${result.product.name} — ₹${display.price} / ${display.unitLabel}`,
    };
  } catch {
    return { title: "Product" };
  }
}

async function ProductPageContent({ params }: ProductPageProps) {
  const { id } = await params;
  let loaded: Awaited<ReturnType<typeof loadProduct>> = null;
  try {
    loaded = await loadProduct(id);
  } catch {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center bg-paper px-6 text-center">
        <p className="text-sm font-medium text-muted">
          We couldn&apos;t load this product.
        </p>
      </main>
    );
  }
  if (!loaded) notFound();

  return (
    <ProductDetail
      product={loaded.product}
      related={loaded.related}
      backHref="/home"
      showPriceMayVary
    />
  );
}

/**
 * Storefront PDP. `params` resolve behind Suspense so the instant shell stays valid.
 */
export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductPageContent params={params} />
    </Suspense>
  );
}

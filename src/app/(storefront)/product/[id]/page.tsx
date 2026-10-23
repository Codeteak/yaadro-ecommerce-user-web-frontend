import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import {
  getSampleProduct,
  SAMPLE_PRODUCTS,
} from "@/lib/sample-products";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return SAMPLE_PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getSampleProduct(id);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.description ?? `${product.name} — ${product.unit}`,
  };
}

function ProductDetailFallback() {
  return (
    <div className="flex flex-col bg-paper pb-8" aria-busy aria-label="Loading product">
      <div className="px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="h-11 w-11 animate-pulse rounded-[13px] bg-mint/70" />
      </div>
      <div className="mt-3 px-5">
        <div className="mx-auto aspect-[4/3] max-w-md animate-pulse rounded-[2rem] bg-mint/50" />
      </div>
      <div className="mt-5 space-y-3 px-5">
        <div className="h-7 w-2/3 animate-pulse rounded-lg bg-mint/60" />
        <div className="h-4 w-20 animate-pulse rounded bg-mint/40" />
        <div className="h-8 w-28 animate-pulse rounded-lg bg-mint/60" />
        <div className="mt-4 h-16 w-full animate-pulse rounded-xl bg-mint/40" />
        <div className="mt-6 h-12 w-full animate-pulse rounded-2xl bg-track/20" />
      </div>
    </div>
  );
}

async function ProductPageContent({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getSampleProduct(id);
  if (!product) notFound();

  return <ProductDetail product={product} backHref="/home" />;
}

/**
 * Storefront PDP — sample catalog only until the real product API lands.
 * `params` resolve behind Suspense so the instant shell stays valid.
 */
export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<ProductDetailFallback />}>
      <ProductPageContent params={params} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductDetailSkeleton } from "@/components/ui/skeletons";
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
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductPageContent params={params} />
    </Suspense>
  );
}

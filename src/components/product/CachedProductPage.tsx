"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { CachedSlot } from "@/components/navigation/CachedSlot";
import { ProductDetailSkeleton } from "@/components/ui/skeletons";
import { loadProductPageData, type ProductPageData } from "@/lib/api/page-data";

type ProductCache =
  | { kind: "ok"; page: ProductPageData }
  | { kind: "missing" }
  | { kind: "error" };

export function CachedProductPage({ id }: { id: string }) {
  return (
    <CachedSlot<ProductCache>
      cacheKey={`product:${id}`}
      load={async () => {
        try {
          const page = await loadProductPageData(id);
          if (!page) return { kind: "missing" };
          return { kind: "ok", page };
        } catch {
          return { kind: "error" };
        }
      }}
      persist={(data) => data.kind === "ok"}
      fallback={<ProductDetailSkeleton />}
    >
      {(data) => <ProductCacheView data={data} />}
    </CachedSlot>
  );
}

function ProductCacheView({ data }: { data: ProductCache }) {
  useEffect(() => {
    if (data.kind === "ok") document.title = data.page.seoTitle ?? data.page.product.name;
  }, [data]);

  if (data.kind === "missing") notFound();

  if (data.kind === "error") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center bg-paper px-6 text-center">
        <p className="text-sm font-medium text-muted">We couldn&apos;t load this product.</p>
      </main>
    );
  }

  return (
    <ProductDetail product={data.page.product} related={data.page.related} backHref="/home" />
  );
}

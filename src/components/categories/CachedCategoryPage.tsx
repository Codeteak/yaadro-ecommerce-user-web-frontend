"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/categories/CategoryListing";
import { CachedSlot } from "@/components/navigation/CachedSlot";
import { CategoryPlpSkeleton } from "@/components/ui/skeletons";
import { loadCategoryPageData } from "@/lib/api/page-data";
import type { CategoryListingData } from "@/lib/api/storefront";

type CategoryCache =
  | { kind: "ok"; listing: CategoryListingData }
  | { kind: "missing" }
  | { kind: "error" };

export function CachedCategoryPage({ slug }: { slug: string }) {
  return (
    <CachedSlot<CategoryCache>
      cacheKey={`category:${slug}`}
      load={async () => {
        try {
          const listing = await loadCategoryPageData(slug);
          if (!listing) return { kind: "missing" };
          return { kind: "ok", listing };
        } catch {
          return { kind: "error" };
        }
      }}
      persist={(data) => data.kind === "ok"}
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden bg-paper">
          <CategoryPlpSkeleton className="min-h-dvh" />
        </main>
      }
    >
      {(data) => <CategoryCacheView slug={slug} data={data} />}
    </CachedSlot>
  );
}

function CategoryCacheView({ slug, data }: { slug: string; data: CategoryCache }) {
  useEffect(() => {
    if (data.kind === "ok") document.title = data.listing.name;
  }, [data]);

  if (data.kind === "missing") notFound();

  if (data.kind === "error") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper">
        <CategoryListing
          slug={slug}
          error="We couldn't load this category."
          railLayout="horizontal"
          className="min-h-0 flex-1"
        />
      </main>
    );
  }

  return (
    <main
      data-storefront-fill
      className="mx-auto flex h-[calc(100dvh-var(--storefront-nav-clearance,5.5rem)-env(safe-area-inset-bottom,0px))] min-h-0 w-full max-w-lg flex-col overflow-hidden bg-paper transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
    >
      <CategoryListing
        slug={slug}
        live={data.listing}
        backHref="/categories"
        railLayout="horizontal"
        className="min-h-0 flex-1"
      />
    </main>
  );
}

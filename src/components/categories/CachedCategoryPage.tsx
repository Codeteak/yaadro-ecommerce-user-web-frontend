"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/categories/CategoryListing";
import { CachedSlot } from "@/components/navigation/CachedSlot";
import { CategoryPlpSkeleton } from "@/components/ui/skeletons";
import { loadCategoryPageData } from "@/lib/api/page-data";
import type { CategoryListingData } from "@/lib/api/storefront";
import { isProducePlpSlug, produceInitialSub } from "@/lib/produce-plp";

type CategoryCache =
  | { kind: "ok"; listing: CategoryListingData }
  | { kind: "missing" }
  | { kind: "error" };

export function CachedCategoryPage({
  slug,
  aisle,
}: {
  slug: string;
  /** Produce PLP: `all` | `fruits` | `vegetables` from `?aisle=`. */
  aisle?: string | null;
}) {
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
      {(data) => (
        <CategoryCacheView slug={slug} aisle={aisle} data={data} />
      )}
    </CachedSlot>
  );
}

function CategoryCacheView({
  slug,
  aisle,
  data,
}: {
  slug: string;
  aisle?: string | null;
  data: CategoryCache;
}) {
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

  const produce = data.listing.produce || isProducePlpSlug(slug);
  const initialSub = produce
    ? produceInitialSub(slug, aisle)
    : "All";

  return (
    <main
      data-storefront-fill
      className="mx-auto flex h-dvh min-h-0 w-full max-w-lg flex-col overflow-hidden bg-paper"
    >
      <CategoryListing
        key={`${slug}-${initialSub}`}
        slug={slug}
        live={data.listing}
        initialSub={initialSub}
        backHref={produce ? "/home" : "/categories"}
        railLayout="horizontal"
        className="min-h-0 flex-1"
      />
    </main>
  );
}

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { CategoriesHub } from "@/components/categories/CategoriesHub";

function CategoriesHubBody() {
  const searchParams = useSearchParams();
  const focusSearch = searchParams.get("focus") === "search";

  return (
    <CategoriesHub
      focusSearch={focusSearch}
      categoryHref={(cat) => `/categories/${cat.slug}`}
    />
  );
}

/**
 * Storefront `/categories` — hub browse + search (home search lands with
 * `?focus=search`). Tiles link to `/categories/[slug]`.
 */
export function CategoriesPageContent() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper">
      <div className="px-5">
        <PageHeader backHref="/home" title="Categories" />
      </div>
      <Suspense
        fallback={
          <div className="px-3 py-8" aria-busy aria-label="Loading categories">
            <div className="h-14 animate-pulse rounded-full bg-mint/50" />
            <div className="mt-6 h-5 w-24 animate-pulse rounded bg-mint/40" />
            <div className="mt-4 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="h-[6.25rem] animate-pulse rounded-[1.15rem] bg-mint/30"
                />
              ))}
            </div>
          </div>
        }
      >
        <CategoriesHubBody />
      </Suspense>
    </main>
  );
}

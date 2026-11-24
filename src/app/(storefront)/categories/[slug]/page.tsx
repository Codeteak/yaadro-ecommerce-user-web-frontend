import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/categories/CategoryListing";
import { CategoryPlpSkeleton } from "@/components/ui/skeletons";
import { loadCategoryListing } from "@/lib/api/storefront";
import { getRequestShopId } from "@/lib/request-shop";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const shopId = await getRequestShopId();
    const category = await loadCategoryListing(shopId, slug);
    if (!category) return { title: "Category" };
    return {
      title: category.name,
      description: `Shop ${category.name} on Yaadro.`,
    };
  } catch {
    return { title: "Category" };
  }
}

async function CategoryListingContent({ params }: CategoryPageProps) {
  const { slug } = await params;
  let listing: Awaited<ReturnType<typeof loadCategoryListing>> = null;
  try {
    const shopId = await getRequestShopId();
    listing = await loadCategoryListing(shopId, slug);
  } catch {
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
  if (!listing) notFound();

  return (
    <main
      data-storefront-fill
      className="mx-auto flex h-[calc(100dvh-var(--storefront-nav-clearance,5.5rem)-env(safe-area-inset-bottom,0px))] min-h-0 w-full max-w-lg flex-col overflow-hidden bg-paper transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
    >
      <CategoryListing
        slug={slug}
        live={listing}
        backHref="/categories"
        railLayout="horizontal"
        className="min-h-0 flex-1"
      />
    </main>
  );
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden bg-paper">
          <CategoryPlpSkeleton className="min-h-dvh" />
        </main>
      }
    >
      <CategoryListingContent params={params} />
    </Suspense>
  );
}

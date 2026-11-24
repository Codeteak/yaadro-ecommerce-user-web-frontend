"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductRail } from "@/components/home/ProductRail";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { cn } from "@/lib/cn";
import type { SampleProduct } from "@/lib/sample-products";

export type CategoryProductRailView = {
  slug: string;
  title: string;
  products: SampleProduct[];
};

type CategoryProductRailsProps = {
  rails: CategoryProductRailView[];
  className?: string;
};

/**
 * Stacked category sections: name + Show all + horizontal product row.
 * Returns null when there is nothing to show.
 */
export function CategoryProductRails({
  rails,
  className,
}: CategoryProductRailsProps) {
  const t = useTypeScale();
  if (rails.length === 0) return null;

  return (
    <div className={cn("w-full bg-paper", className)}>
      <div className="mx-auto w-full max-w-lg">
        {rails.map((rail) => (
          <section
            key={rail.slug}
            aria-labelledby={`home-rail-${rail.slug}`}
            className="pt-6 first:pt-4"
          >
            <div
              className={cn(
                "flex items-end justify-between px-5",
                t.homeShowAllGap,
              )}
            >
              <h2
                id={`home-rail-${rail.slug}`}
                className={t.homeSectionHeading}
              >
                {rail.title}
              </h2>
              <Link
                href={`/categories/${rail.slug}`}
                transitionTypes={["nav-forward"]}
                className="flex shrink-0 items-center gap-1 text-sm font-semibold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Show all
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className={cn("mt-1", t.homeSectionToGrid)}>
              <ProductRail products={rail.products} label={rail.title} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

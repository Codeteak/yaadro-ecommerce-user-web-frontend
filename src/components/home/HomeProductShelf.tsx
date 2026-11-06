"use client";

import { ProductCard } from "@/components/product/ProductCard";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { cn } from "@/lib/cn";
import {
  productsForShelf,
  type HomeShelfDef,
} from "@/lib/home-shelves";
import type { SampleProduct } from "@/lib/sample-products";

/**
 * Vertical 2-col product shelf for home (Featured / Most ordered /
 * Favourites). No horizontal scroll — page scroll only.
 */
export function HomeProductShelf({
  shelf,
  className,
  products: productsProp,
}: {
  shelf: { id: string; title: string; subtitle?: string };
  className?: string;
  /** Live shelf products. Omit to resolve the sample shelf by id. */
  products?: SampleProduct[];
}) {
  const t = useTypeScale();
  const products = productsProp ?? productsForShelf(shelf as HomeShelfDef);

  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby={`home-shelf-${shelf.id}`}
      className={cn("mx-auto w-full max-w-lg px-5", className)}
    >
      <div className={t.homeSectionHeaderWrap}>
        <h2
          id={`home-shelf-${shelf.id}`}
          className={t.homeSectionHeading}
        >
          {shelf.title}
        </h2>
        <p className={t.homeSectionSubtitle}>{shelf.subtitle}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <li key={product.id} className="min-w-0">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}

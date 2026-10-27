"use client";

import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import {
  productsForShelf,
  type HomeShelfDef,
} from "@/lib/home-shelves";

/**
 * Vertical 2-col product shelf for home (Featured / Most ordered /
 * Favourites). No horizontal scroll — page scroll only.
 */
export function HomeProductShelf({
  shelf,
  className,
}: {
  shelf: HomeShelfDef;
  className?: string;
}) {
  const products = productsForShelf(shelf);

  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby={`home-shelf-${shelf.id}`}
      className={cn("mx-auto w-full max-w-lg px-5", className)}
    >
      <div className="mb-3">
        <h2
          id={`home-shelf-${shelf.id}`}
          className="text-lg font-extrabold tracking-tight text-ink"
        >
          {shelf.title}
        </h2>
        <p className="mt-0.5 text-[12px] font-medium text-muted">
          {shelf.subtitle}
        </p>
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

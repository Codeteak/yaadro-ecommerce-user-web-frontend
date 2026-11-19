"use client";

import { useState } from "react";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { HOME_CATEGORIES } from "@/lib/home-categories";

const SAMPLE = [
  ...HOME_CATEGORIES.map((c) => ({
    name: c.name,
    slug: c.name.toLowerCase().replace(/\s+/g, "-"),
    image: c.image,
  })),
  { name: "No photo", slug: "no-photo", image: "" },
];

/**
 * Phase B #28 playground — same CategoryCard for home rail + categories grid.
 */
export function PhaseBCategoryCardDemo() {
  const [active, setActive] = useState(SAMPLE[0]?.slug ?? "");

  return (
    <div className="space-y-8 bg-paper px-4 py-5 sm:px-5">
      <section>
        <h3 className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
          Home rail · CategoryCard (pill)
        </h3>
        <p className="mt-1 text-[12px] text-muted">
          Same API: image if present, else icon + name.
        </p>
        <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SAMPLE.map((cat) => (
            <CategoryCard
              key={`rail-${cat.slug}`}
              name={cat.name}
              image={cat.image}
              slug={cat.slug}
              active={active === cat.slug}
              onClick={() => setActive(cat.slug)}
              variant="pill"
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[11px] font-bold tracking-wide text-forest/70 uppercase">
          Categories hub · CategoryCard (card)
        </h3>
        <p className="mt-1 text-[12px] text-muted">
          Hub grid imports the same CategoryCard — not a separate HubTile.
        </p>
        <ul className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3">
          {SAMPLE.map((cat) => (
            <li key={`hub-${cat.slug}`} className="min-w-0">
              <CategoryCard
                name={cat.name}
                image={cat.image}
                slug={cat.slug}
                active={active === cat.slug}
                onClick={() => setActive(cat.slug)}
                variant="card"
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

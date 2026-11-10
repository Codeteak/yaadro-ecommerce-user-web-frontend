"use client";

import { useMemo, useState } from "react";
import { CategoryTile } from "@/components/home/CategoryTile";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import type { CategoryBranch } from "@/lib/api/storefront";
import type { SampleProduct } from "@/lib/sample-products";

type CategoryBrowserProps = {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
  focusSearch?: boolean;
};

function productsFor(
  selected: string,
  branches: CategoryBranch[],
  products: SampleProduct[],
) {
  if (selected === "all") return products;
  if (selected.startsWith("sub:")) {
    const slug = selected.slice(4);
    return products.filter((product) => product.categorySlug === slug);
  }
  const slug = selected.slice(4);
  const branch = branches.find((item) => item.slug === slug);
  if (!branch) return [];
  const slugs = new Set([branch.slug, ...branch.children.map((child) => child.slug)]);
  return products.filter(
    (product) => product.categorySlug != null && slugs.has(product.categorySlug),
  );
}

function selectedName(selected: string, branches: CategoryBranch[]) {
  if (selected === "all") return "All";
  if (selected.startsWith("sub:")) {
    const slug = selected.slice(4);
    for (const branch of branches) {
      const child = branch.children.find((item) => item.slug === slug);
      if (child) return child.name;
    }
    return "Category";
  }
  return branches.find((item) => item.slug === selected.slice(4))?.name ?? "Category";
}

export function CategoryBrowser({
  branches,
  products,
  error,
  focusSearch = false,
}: CategoryBrowserProps) {
  const [selected, setSelected] = useState("all");
  const [query, setQuery] = useState("");
  const title = selectedName(selected, branches);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return productsFor(selected, branches, products).filter((product) =>
      q ? product.name.toLowerCase().includes(q) : true,
    );
  }, [branches, products, query, selected]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-3">
        <HomeSearchBar
          value={query}
          onChange={setQuery}
          autoFocus={focusSearch}
          placeholder="Search products"
        />
      </div>
      {error ? (
        <p className="px-4 pb-2 text-sm font-medium text-muted">{error}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 border-t border-black/5">
        <aside className="w-[6.5rem] shrink-0 overflow-y-auto border-r border-black/5 pb-28">
          <div className="flex flex-col items-center gap-3 px-2 py-3">
            <CategoryTile
              name="All"
              active={selected === "all"}
              onClick={() => setSelected("all")}
            />
            {branches.map((branch) => (
              <div key={branch.id} className="flex flex-col items-center gap-3">
                <CategoryTile
                  name={branch.name}
                  image={branch.image || CATEGORY_IMAGE_FALLBACK}
                  active={selected === `cat:${branch.slug}`}
                  onClick={() => setSelected(`cat:${branch.slug}`)}
                />
                {branch.children.map((child) => (
                  <CategoryTile
                    key={child.id}
                    name={child.name}
                    image={child.image || CATEGORY_IMAGE_FALLBACK}
                    active={selected === `sub:${child.slug}`}
                    onClick={() => setSelected(`sub:${child.slug}`)}
                  />
                ))}
              </div>
            ))}
          </div>
        </aside>
        <section
          aria-label={`${title} products`}
          className="min-w-0 flex-1 overflow-y-auto px-3 pt-3 pb-28"
        >
          <h2 className="mb-3 text-lg font-bold text-black">{title}</h2>
          <div key={selected} className="category-switch">
            {visible.length === 0 ? (
              <p className="py-6 text-sm font-medium text-muted">
                Nothing in this category yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}


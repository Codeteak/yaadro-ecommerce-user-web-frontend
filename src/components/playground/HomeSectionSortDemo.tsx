"use client";

import { useMemo, useState } from "react";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryContext";
import { HomePullContent } from "@/components/home/HomePullContent";
import { DemoFrame } from "@/components/playground/DemoFrame";
import type { LiveShelf } from "@/components/home/HomeProductShelves";
import type { HomeBodyLayout } from "@/lib/home-section-order";
import { SAMPLE_DAIRY_SHELF } from "@/lib/daily-dairy";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";
import { cn } from "@/lib/cn";

/**
 * Playground: confirm home stack —
 * pills → All (rail products) → admin sort → produce → category rails last.
 */
export function HomeSectionSortDemo() {
  const [layout, setLayout] = useState<HomeBodyLayout>("canonical");

  const shelves: LiveShelf[] = useMemo(
    () => [
      {
        id: "price-drop",
        title: "PRICE DROP",
        sortOrder: 10,
        products: SAMPLE_PRODUCTS.filter((p) =>
          ["Fruits", "Vegetables"].includes(p.category),
        ).slice(0, 4),
      },
      {
        id: "daily-diary",
        title: "Daily Diary",
        sortOrder: 20,
        products: SAMPLE_DAIRY_SHELF.products.slice(0, 4),
      },
      {
        id: "festive-empty",
        title: "Festive",
        sortOrder: 30,
        products: [],
      },
    ],
    [],
  );

  const categoryRails = useMemo(
    () => [
      {
        slug: "eggs",
        title: "Eggs",
        products: SAMPLE_PRODUCTS.filter((p) => /egg/i.test(p.name)).slice(
          0,
          4,
        ),
      },
      {
        slug: "dairy",
        title: "Dairy",
        products: SAMPLE_DAIRY_SHELF.products.slice(0, 4),
      },
    ],
    [],
  );

  return (
    <DemoFrame
      surface="bare"
      note="Wired /home: pills → All (tap rail) → admin sort_order → fruits/veggies → category rails last. Daily Diary = art card. Flip legacy only to compare the old buried order."
    >
      <div className="space-y-3 bg-paper px-4 pt-4 pb-6">
        <div className="flex flex-wrap gap-2">
          <LayoutChip
            active={layout === "canonical"}
            onClick={() => setLayout("canonical")}
            label="Canonical (live)"
          />
          <LayoutChip
            active={layout === "legacy-buried"}
            onClick={() => setLayout("legacy-buried")}
            label="Legacy buried admin"
          />
        </div>
        <p className="text-[12px] leading-5 text-muted">
          Category pills drive the All strip under them. Admin shelves follow.
          Eggs/Dairy listing rails always sit after produce.
        </p>
        <div className="relative max-h-[78vh] overflow-y-auto overscroll-contain rounded-2xl bg-paper ring-1 ring-black/5">
          <HomeCategoryProvider>
            <HomePullContent
              layout={layout}
              shelves={shelves}
              categoryRails={categoryRails}
              fruits={SAMPLE_PRODUCTS.filter((p) => p.category === "Fruits").slice(
                0,
                4,
              )}
              vegetables={SAMPLE_PRODUCTS.filter(
                (p) => p.category === "Vegetables",
              ).slice(0, 4)}
            />
          </HomeCategoryProvider>
        </div>
      </div>
    </DemoFrame>
  );
}

function LayoutChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition",
        active
          ? "bg-track text-black ring-track"
          : "bg-white text-forest ring-forest/15",
      )}
    >
      {label}
    </button>
  );
}

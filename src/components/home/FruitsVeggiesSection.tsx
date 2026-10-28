"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { cn } from "@/lib/cn";
import { homeCategoryImage } from "@/lib/home-categories";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";
import {
  getProductsByCategory,
  type SampleProduct,
} from "@/lib/sample-products";

/** Full-bleed produce card background (user-provided section art). */
const BG = "/home/fruits-veggies-section.jpg";

type ProduceFilter = "All" | "Fruits" | "Vegetables";

const FILTERS: {
  id: ProduceFilter;
  /** Catalog display name on the chip. */
  label: string;
  image?: string;
}[] = [
  { id: "All", label: "All" },
  {
    id: "Fruits",
    label: "Fruits",
    image: homeCategoryImage("Fruits"),
  },
  {
    id: "Vegetables",
    label: "Vegetables",
    image: homeCategoryImage("Vegetables"),
  },
];

const LIMIT = 10;

/**
 * Home produce band (after ProductSection on `/home`): full-section
 * card with BG image, All / Fruits / Vegetables filters (local only),
 * product rail, and Browse all → produce PLP (`/categories/fruits` or
 * `/categories/vegetables` from the active chip; All → fruits).
 *
 * Dark scrims + light type keep headings readable on the busy photo.
 */
export function FruitsVeggiesSection({ className }: { className?: string }) {
  const t = useTypeScale();
  const [filter, setFilter] = useState<ProduceFilter>("All");

  const browseHref =
    filter === "Vegetables" ? "/categories/vegetables" : "/categories/fruits";

  const products = useMemo(() => {
    if (filter === "Fruits") {
      return getProductsByCategory("Fruits").slice(0, LIMIT);
    }
    if (filter === "Vegetables") {
      return getProductsByCategory("Vegetables").slice(0, LIMIT);
    }
    const fruits = getProductsByCategory("Fruits").slice(0, LIMIT);
    const veggies = getProductsByCategory("Vegetables").slice(0, LIMIT);
    const mixed: SampleProduct[] = [];
    const n = Math.max(fruits.length, veggies.length);
    for (let i = 0; i < n; i++) {
      if (fruits[i]) mixed.push(fruits[i]);
      if (veggies[i]) mixed.push(veggies[i]);
    }
    return mixed.slice(0, LIMIT);
  }, [filter]);

  const listTitle =
    filter === "All"
      ? "Fruits & Vegetables"
      : filter === "Fruits"
        ? "Fruits"
        : "Vegetables";

  return (
    <section
      aria-label="Fresh fruits and vegetables"
      className={cn("relative w-full bg-paper px-3 py-5 sm:px-4", className)}
    >
      <div className="relative mx-auto flex min-h-[34rem] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] shadow-[0_16px_40px_rgba(20,40,20,0.35)] ring-1 ring-black/[0.08] sm:min-h-[36rem]">
        <Image
          src={BG}
          alt=""
          fill
          sizes="(max-width: 512px) 100vw, 512px"
          className="object-cover object-center"
        />

        {/* Readability stack: overall dim + stronger top/bottom for type */}
        <div
          className="pointer-events-none absolute inset-0 bg-black/35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-black/75 via-black/40 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black/70 via-black/35 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 flex min-h-[34rem] flex-1 flex-col justify-between gap-6 px-5 pt-9 pb-6 sm:min-h-[36rem] sm:pt-10 sm:pb-7">
          <div className="text-center">
            <p className="text-[11px] font-bold tracking-[0.18em] text-white/85 uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
              Farm fresh
            </p>
            <h2 className="mt-2 text-[1.7rem] leading-tight font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
              Fruits &amp; veggies
            </h2>
            <p className="mx-auto mt-2 max-w-[16rem] text-[13px] leading-5 font-medium text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]">
              Pick a category below — Browse all opens that produce aisle.
            </p>

            <div
              className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
              role="tablist"
              aria-label="Produce filter"
            >
              {FILTERS.map((chip) => {
                const selected = filter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setFilter(chip.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full py-2 pr-3.5 pl-2 text-[13px] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                      !chip.image && "px-4",
                      selected
                        ? "bg-track text-black"
                        : "bg-white text-forest ring-1 ring-white/40 hover:bg-mint",
                    )}
                  >
                    {chip.image ? (
                      <span
                        className={cn(
                          "relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#efe6da] ring-2",
                          selected ? "ring-white/90" : "ring-forest/10",
                        )}
                      >
                        <Image
                          src={chip.image}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </span>
                    ) : null}
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3 rounded-[1.35rem] bg-black/25 p-3 ring-1 ring-white/15 backdrop-blur-[2px] sm:p-3.5">
            <div
              className={cn(
                "flex items-end justify-between px-0.5",
                t.homeShowAllGap,
              )}
            >
              <div className="min-w-0">
                <h3 className={t.homeCompactHeading}>{listTitle}</h3>
                <p className={t.homeCompactSubtitle}>
                  {products.length}{" "}
                  {products.length === 1 ? "item" : "items"} · swipe →
                </p>
              </div>
              <Link
                href={browseHref}
                className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold text-leaf shadow-sm transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Browse all
              </Link>
            </div>

            <div
              key={filter}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-0.5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className={cn(PRODUCT_CAROUSEL_SLOT, "shrink-0 snap-start")}
                >
                  <ProductCard product={product} />
                </div>
              ))}
              <div className="w-2 shrink-0" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

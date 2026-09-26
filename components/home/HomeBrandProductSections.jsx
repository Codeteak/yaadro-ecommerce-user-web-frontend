'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useProducts } from '../../hooks/useProducts';
import { useStorefrontShopGate } from '../../hooks/useStorefrontShopGate';
import { resolveProductBrand } from '../../utils/displayText';
import { dedupeProductsByVariantGroup } from '../../utils/productUtils';
import ProductGrid from '../ProductGrid';
import { ArrowRightRegular as ArrowRight } from '../icons';

/** 2-col grid × 4 rows on mobile — match category home sections. */
const PRODUCTS_PER_BRAND = 8;
/** Keep the home page bounded. */
const MAX_BRAND_SECTIONS = 8;
const CATALOG_FETCH_LIMIT = 48;

function brandKey(label) {
  return String(label || '').trim().toLowerCase();
}

function BrandProductSection({ brandName, products, isLoading }) {
  const name = String(brandName || '').trim() || 'Brand';
  const href = `/products?search=${encodeURIComponent(name)}`;
  const list = Array.isArray(products) ? products : [];

  if (!isLoading && list.length === 0) return null;

  return (
    <section className="py-6 sm:py-8 md:py-10 [@media(max-height:720px)]:py-5">
      <div className="mb-4 md:mb-5 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
          {name}
        </h2>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        {isLoading && list.length === 0 ? (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-4"
            aria-busy="true"
            aria-label={`Loading ${name} products`}
          >
            {Array.from({ length: PRODUCTS_PER_BRAND }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-[20px] bg-gray-100"
              />
            ))}
          </div>
        ) : (
          <ProductGrid products={list} cardVariant="shelf" />
        )}

        <div className="mt-5 flex justify-center">
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#902bf5] transition hover:text-[#7d24d6]"
          >
            <span>See all</span>
            <ArrowRight size={16} className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Vertical brand product blocks for home — after category sections.
 * Groups catalog products by resolved brand (DB brand or name inference).
 */
export default function HomeBrandProductSections() {
  const { ready } = useStorefrontShopGate();

  const { data: catalogData, isLoading, isFetching } = useProducts({
    limit: CATALOG_FETCH_LIMIT,
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: ready,
  });

  const brandSections = useMemo(() => {
    const raw = Array.isArray(catalogData?.products) ? catalogData.products : [];
    const byKey = new Map();

    for (const product of raw) {
      if (!product) continue;
      const label = resolveProductBrand(product, { allowInfer: true });
      if (!label) continue;
      const key = brandKey(label);
      if (!key || key === 'unknown') continue;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { name: label, products: [] };
        byKey.set(key, entry);
      }
      entry.products.push(product);
    }

    return Array.from(byKey.values())
      .map((entry) => {
        const products = dedupeProductsByVariantGroup(entry.products).slice(
          0,
          PRODUCTS_PER_BRAND
        );
        return { name: entry.name, products, count: products.length };
      })
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, MAX_BRAND_SECTIONS);
  }, [catalogData?.products]);

  const loading = Boolean(isLoading || isFetching);

  if (!loading && brandSections.length === 0) return null;

  if (loading && brandSections.length === 0) {
    return (
      <div>
        <BrandProductSection brandName="Brands" products={[]} isLoading />
      </div>
    );
  }

  return (
    <div>
      {brandSections.map((section) => (
        <BrandProductSection
          key={brandKey(section.name)}
          brandName={section.name}
          products={section.products}
          isLoading={false}
        />
      ))}
    </div>
  );
}

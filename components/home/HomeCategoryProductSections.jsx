'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import { productKeys, useRootCategories } from '../../hooks/useProducts';
import { useStorefrontShopGate } from '../../hooks/useStorefrontShopGate';
import { getProducts } from '../../utils/productApi';
import { dedupeProductsByVariantGroup } from '../../utils/productUtils';
import {
  CATEGORY_ID_UUID,
  isAllNamedCategory,
  productsCategoryHref,
} from '../products/productsBrowseConstants';
import ProductGrid from '../ProductGrid';
import { ArrowRightRegular as ArrowRight } from '../icons';

/** 2-col grid × 4 rows on mobile. */
const PRODUCTS_PER_CATEGORY = 8;

function categoryId(category) {
  return String(category?.id ?? category?._id ?? '').trim();
}

function categoryHref(category) {
  return productsCategoryHref(category);
}

function CategoryProductSection({ category, products, isLoading }) {
  const name = String(category?.name || '').trim() || 'Category';
  const href = categoryHref(category);
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
            {Array.from({ length: PRODUCTS_PER_CATEGORY }).map((_, i) => (
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
 * Vertical category product blocks for home — after Featured.
 * Reuses storefront list + root categories; no cart/pricing changes.
 */
export default function HomeCategoryProductSections() {
  const { shopId, ready } = useStorefrontShopGate();
  const { data: rootCategoriesData } = useRootCategories();

  const rootCategories = useMemo(
    () =>
      (rootCategoriesData || []).filter((c) => {
        if (!c || c.isActive === false) return false;
        if (isAllNamedCategory(c)) return false;
        const id = categoryId(c);
        return id && CATEGORY_ID_UUID.test(id);
      }),
    [rootCategoriesData]
  );

  const categoryQueries = useQueries({
    queries: rootCategories.map((category) => {
      const id = categoryId(category);
      const apiParams = {
        category_id: id,
        include_descendants: true,
        limit: PRODUCTS_PER_CATEGORY,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      return {
        queryKey: productKeys.list(shopId, apiParams),
        queryFn: () => getProducts(apiParams),
        enabled: ready && Boolean(id),
        staleTime: 1000 * 60 * 5,
      };
    }),
  });

  if (!rootCategories.length) return null;

  return (
    <div>
      {rootCategories.map((category, index) => {
        const query = categoryQueries[index];
        const products = dedupeProductsByVariantGroup(query?.data?.products || []).slice(
          0,
          PRODUCTS_PER_CATEGORY
        );
        return (
          <CategoryProductSection
            key={categoryId(category)}
            category={category}
            products={products}
            isLoading={Boolean(query?.isLoading || query?.isFetching)}
          />
        );
      })}
    </div>
  );
}

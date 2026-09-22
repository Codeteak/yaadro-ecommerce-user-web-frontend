'use client';

import { Suspense, useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '../../../components/ProductCard';
import BrowsePageHeader from '../../../components/BrowsePageHeader';
import FloatingViewCartPill from '../../../components/FloatingViewCartPill';
import { CategoryRailItem } from '../../../components/products/ProductsCategoryRail';
import { useCategoriesTree, useInfiniteProducts } from '../../../hooks/useProducts';
import InfiniteScrollSentinel from '../../../components/InfiniteScrollSentinel';
import CategoryBrowseSkeleton from '../../../components/skeletons/CategoryBrowseSkeleton';
import { ProductGridSkeleton } from '../../../components/skeletons/primitives';
import { useBottomNavVisibility } from '../../../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../../../context/LayoutHeightsContext';

function findCategoryInTree(nodes, id) {
  if (!id || !nodes?.length) return null;
  for (const n of nodes) {
    if (String(n.id) === String(id) || (n.slug && String(n.slug) === String(id))) return n;
    const found = findCategoryInTree(n.children || [], id);
    if (found) return found;
  }
  return null;
}

const CATEGORY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function CategoryBrowseInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categorySlugOrId = params?.categoryId ? decodeURIComponent(String(params.categoryId)) : '';
  const { isVisible: bottomNavVisible } = useBottomNavVisibility();
  const { bottomNavHeight } = useLayoutHeights();
  const bottomInset = bottomNavVisible ? bottomNavHeight : 0;

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [brandFilter, setBrandFilter] = useState('');
  const [sortKey, setSortKey] = useState('default');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const { data: categoryTree = [], isLoading: treeLoading } = useCategoriesTree();

  const category = useMemo(
    () => findCategoryInTree(categoryTree, categorySlugOrId),
    [categoryTree, categorySlugOrId]
  );

  const subcategories = useMemo(
    () => (category?.children || []).filter((c) => c.isActive !== false),
    [category]
  );

  const subFromUrl = searchParams.get('sub');
  const validSub =
    subFromUrl && subcategories.some((s) => s.id === subFromUrl) ? subFromUrl : null;

  // Backend expects UUIDs for `category_id`. Prefer URL UUID immediately so products
  // start loading without waiting for the full category tree (slug URLs still wait).
  const urlIsUuid = CATEGORY_UUID_RE.test(categorySlugOrId);
  const resolvedCategoryId = category?.id
    ? String(category.id)
    : urlIsUuid
      ? categorySlugOrId
      : '';
  const filterCategoryId = validSub || resolvedCategoryId;

  const infiniteParams = useMemo(() => {
    const q = {
      category_id: filterCategoryId,
      limit: 24,
    };
    // Parent category (e.g. Dairy) should include children like Ghee.
    if (!validSub && filterCategoryId) {
      q.include_descendants = true;
    }
    if (sortKey === 'price-asc') {
      q.sort_by = 'price';
      q.sort_order = 'asc';
    } else if (sortKey === 'price-desc') {
      q.sort_by = 'price';
      q.sort_order = 'desc';
    } else {
      q.sort_by = 'created_at';
      q.sort_order = 'desc';
    }
    return q;
  }, [filterCategoryId, sortKey, validSub]);

  const {
    data: productsInfinite,
    isLoading: productsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteProducts({
    ...infiniteParams,
    // UUID in URL → fetch products right away; tree still loads for the side rail.
    enabled: !!filterCategoryId && (!!category || urlIsUuid),
  });

  const products = useMemo(
    () => (productsInfinite?.pages || []).flatMap((p) => p?.products || []),
    [productsInfinite?.pages]
  );

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const brandOptions = useMemo(() => {
    const set = new Set();
    searchFiltered.forEach((p) => {
      if (p.brand && String(p.brand).trim()) set.add(String(p.brand).trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [searchFiltered]);

  const brandFiltered = useMemo(() => {
    if (!brandFilter) return searchFiltered;
    return searchFiltered.filter((p) => String(p.brand || '') === brandFilter);
  }, [searchFiltered, brandFilter]);

  const displayProducts = brandFiltered;

  const handleBack = useCallback(() => {
    router.replace('/categories');
  }, [router]);

  const onSearchOpenToggle = useCallback(() => setSearchOpen((v) => !v), []);

  useEffect(() => {
    setBrandFilter('');
  }, [validSub, categorySlugOrId]);

  useEffect(() => {
    if (!subFromUrl || validSub) return;
    router.replace(`/categories/${encodeURIComponent(categorySlugOrId)}`, { scroll: false });
  }, [subFromUrl, validSub, router, categorySlugOrId]);

  const setSubFilter = (subId) => {
    if (!subId) {
      router.replace(`/categories/${encodeURIComponent(categorySlugOrId)}`, { scroll: false });
    } else {
      router.replace(
        `/categories/${encodeURIComponent(categorySlugOrId)}?sub=${encodeURIComponent(subId)}`,
        { scroll: false }
      );
    }
  };

  if (!category && !urlIsUuid) {
    if (treeLoading) {
      return <CategoryBrowseSkeleton />;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 pb-28 pt-[env(safe-area-inset-top,0px)] text-center">
        <p className="text-[15px] font-medium text-gray-800">Category not found</p>
        <p className="mt-1 text-[13px] text-gray-500">It may have been removed or the link is invalid.</p>
        <Link
          href="/categories"
          className="mt-6 rounded-full bg-violet-600 px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Back to categories
        </Link>
      </div>
    );
  }

  const categoryTitle = category?.name || 'Products';
  const typeSelectValue = validSub || '';
  const activeSubLabel = validSub
    ? subcategories.find((s) => s.id === validSub)?.name || 'Type'
    : `All ${categoryTitle}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)] w-full max-w-full overflow-x-clip">
      <BrowsePageHeader
        title={categoryTitle}
        searchOpen={searchOpen}
        onBack={handleBack}
        onSearchToggle={onSearchOpenToggle}
        searchAriaLabel="Search products"
        searchSlot={
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="h-10 w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 text-[13px] text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
              autoFocus
            />
          </div>
        }
        toolbar={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMoreFilters((v) => !v)}
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border bg-white ${
                  showMoreFilters ? 'border-violet-300 bg-violet-50' : 'border-gray-200'
                }`}
                aria-label="More filters"
              >
                <svg className="h-[18px] w-[18px] text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </button>

              <div className="relative min-w-0 flex-1 sm:max-w-[140px]">
                <label htmlFor="filter-type" className="sr-only">
                  Type
                </label>
                <select
                  id="filter-type"
                  value={typeSelectValue}
                  onChange={(e) => setSubFilter(e.target.value || null)}
                  disabled={subcategories.length === 0}
                  className="h-9 w-full appearance-none rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-[12px] font-semibold text-gray-800 shadow-sm disabled:opacity-50"
                >
                  <option value="">{subcategories.length ? 'All types' : 'Type'}</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className="relative min-w-0 flex-1 sm:max-w-[140px]">
                <label htmlFor="filter-brand" className="sr-only">
                  Brand
                </label>
                <select
                  id="filter-brand"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-[12px] font-semibold text-gray-800 shadow-sm"
                >
                  <option value="">Brand</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {showMoreFilters ? (
              <div className="mt-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sort</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'default', label: 'Relevance' },
                    { key: 'price-asc', label: 'Price: low' },
                    { key: 'price-desc', label: 'Price: high' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSortKey(key);
                        setShowMoreFilters(false);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                        sortKey === key
                          ? 'border-violet-400 bg-violet-50 text-violet-900'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        }
      />

      <div className="flex w-full max-w-screen-2xl flex-row">
        <aside
          className="sticky z-30 w-[76px] shrink-0 self-start border-r border-gray-100 bg-transparent py-2 sm:w-[80px] top-[calc(5.75rem+env(safe-area-inset-top,0px))]"
          style={{
            maxHeight: `calc(100dvh - env(safe-area-inset-top,0px) - 5.75rem - ${bottomInset}px)`,
          }}
        >
          <div className="flex max-h-[inherit] flex-col gap-1 overflow-y-auto overscroll-contain scrollbar-hide px-1.5 pb-4">
            <CategoryRailItem
              active={!validSub}
              label="All"
              category={category}
              onClick={() => setSubFilter(null)}
            />
            {subcategories.map((sub) => (
              <CategoryRailItem
                key={sub.id}
                active={validSub === sub.id}
                label={sub.name}
                category={sub}
                onClick={() => setSubFilter(sub.id)}
              />
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-gray-50 px-2.5 py-3 sm:px-3">
          {!productsLoading && (
            <p className="mb-2 text-[11px] text-gray-400">
              {activeSubLabel}
              {displayProducts.length > 0
                ? ` · ${displayProducts.length} product${displayProducts.length !== 1 ? 's' : ''}`
                : search.trim() || brandFilter
                  ? ' · No matches'
                  : ' · No products'}
            </p>
          )}

          {productsLoading ? (
            <ProductGridSkeleton count={8} variant="products" />
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-5v8"
                  />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-gray-600">No products to show</p>
              <p className="mt-1 max-w-xs text-[12px] text-gray-400">
                Try another type, brand, or clear search.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {displayProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {!search.trim() && !brandFilter && (
                <InfiniteScrollSentinel
                  hasNextPage={!!hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                  showEndLabel={displayProducts.length > 0 && !hasNextPage}
                />
              )}
            </>
          )}
        </main>
      </div>

      <FloatingViewCartPill />
    </div>
  );
}

export default function CategoryBrowseClient() {
  return (
    <Suspense fallback={<CategoryBrowseSkeleton />}>
      <CategoryBrowseInner />
    </Suspense>
  );
}

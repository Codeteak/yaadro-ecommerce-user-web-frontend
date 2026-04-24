'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '../../../components/ProductCard';
import { useCategoriesTree, useProducts } from '../../../hooks/useProducts';

function categoryThumbUrl(cat) {
  if (!cat || typeof cat.image !== 'string') return null;
  const u = cat.image.trim();
  return u.length > 0 ? u : null;
}

function SubcategoryRailItem({ active, label, imageUrl, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition ${
        active
          ? 'bg-violet-100 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.15)]'
          : 'bg-transparent hover:bg-gray-50 active:bg-gray-100'
      }`}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[15px] font-bold text-gray-400">
            {(label || '?').slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <span
        className={`max-w-[4.5rem] text-center text-[10px] leading-tight ${
          active ? 'font-bold text-violet-950' : 'font-medium text-gray-600'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function findCategoryInTree(nodes, id) {
  if (!id || !nodes?.length) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findCategoryInTree(n.children || [], id);
    if (found) return found;
  }
  return null;
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white animate-pulse"
        >
          <div className="aspect-square bg-gray-100" />
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-4/5 rounded-full bg-gray-100" />
            <div className="h-3 w-3/5 rounded-full bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryBrowseInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = params?.categoryId ? decodeURIComponent(String(params.categoryId)) : '';

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [brandFilter, setBrandFilter] = useState('');
  const [sortKey, setSortKey] = useState('default');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const { data: categoryTree = [], isLoading: treeLoading } = useCategoriesTree();

  const category = useMemo(
    () => findCategoryInTree(categoryTree, categoryId),
    [categoryTree, categoryId]
  );

  const subcategories = useMemo(
    () => (category?.children || []).filter((c) => c.isActive !== false),
    [category]
  );

  const subFromUrl = searchParams.get('sub');
  const validSub =
    subFromUrl && subcategories.some((s) => s.id === subFromUrl) ? subFromUrl : null;

  const filterCategoryId = validSub || categoryId;

  const { data: productsData, isLoading: productsLoading } = useProducts({
    category_id: filterCategoryId,
    limit: 50,
    enabled: !!category && !!filterCategoryId,
  });

  const products = productsData?.products || [];

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

  const displayProducts = useMemo(() => {
    const list = [...brandFiltered];
    if (sortKey === 'price-asc') list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    if (sortKey === 'price-desc') list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    return list;
  }, [brandFiltered, sortKey]);

  useEffect(() => {
    setBrandFilter('');
  }, [validSub, categoryId]);

  useEffect(() => {
    if (!subFromUrl || validSub) return;
    router.replace(`/categories/${encodeURIComponent(categoryId)}`, { scroll: false });
  }, [subFromUrl, validSub, router, categoryId]);

  const setSubFilter = (subId) => {
    if (!subId) {
      router.replace(`/categories/${encodeURIComponent(categoryId)}`, { scroll: false });
    } else {
      router.replace(
        `/categories/${encodeURIComponent(categoryId)}?sub=${encodeURIComponent(subId)}`,
        { scroll: false }
      );
    }
  };

  if (treeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)]">
        <div className="sticky top-0 z-30 border-b border-gray-100 bg-white px-4 py-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div className="px-4 py-4">
          <ProductGridSkeleton />
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 pb-28 pt-[env(safe-area-inset-top,0px)] text-center">
        <p className="text-[15px] font-medium text-gray-800">Category not found</p>
        <p className="mt-1 text-[13px] text-gray-500">It may have been removed or the link is invalid.</p>
        <Link
          href="/categories"
          className="mt-6 rounded-full bg-emerald-600 px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Back to categories
        </Link>
      </div>
    );
  }

  const imageUrl =
    typeof category.image === 'string' && category.image.trim().length > 0
      ? category.image.trim()
      : null;

  const typeSelectValue = validSub || '';
  const activeSubLabel = validSub
    ? subcategories.find((s) => s.id === validSub)?.name || 'Type'
    : `All ${category.name}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)] w-full max-w-full overflow-x-hidden">
      {/* App bar — back, title, wishlist, search (reference-style) */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50"
            aria-label="Back"
          >
            <svg className="h-3.5 w-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-gray-900 sm:text-[16px]">
            {category.name}
          </h1>
          <Link
            href="/wishlist"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700"
            aria-label="Wishlist"
          >
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border bg-gray-50 ${
              searchOpen ? 'border-violet-300 ring-1 ring-violet-200' : 'border-gray-200'
            }`}
            aria-expanded={searchOpen}
            aria-label="Search products"
          >
            <svg className="h-[18px] w-[18px] text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
        {searchOpen && (
          <div className="border-t border-gray-50 px-3 pb-3 pt-0 sm:px-4">
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
                className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-[13px] text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* Left thumbnail rail + main (reference: sidebar + filters + grid) */}
      <div className="flex w-full max-w-screen-2xl flex-row">
        <aside
          className="sticky z-30 w-[76px] shrink-0 self-start border-r border-gray-200 bg-white py-2 sm:w-[80px] top-[calc(52px+env(safe-area-inset-top,0px))]"
          style={{
            maxHeight:
              'calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 52px)',
          }}
        >
          <div className="flex max-h-[inherit] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1.5 pb-4">
            <SubcategoryRailItem
              active={!validSub}
              label="All"
              imageUrl={imageUrl}
              onClick={() => setSubFilter(null)}
            />
            {subcategories.map((sub) => (
              <SubcategoryRailItem
                key={sub.id}
                active={validSub === sub.id}
                label={sub.name}
                imageUrl={categoryThumbUrl(sub)}
                onClick={() => setSubFilter(sub.id)}
              />
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-gray-50 px-2.5 py-3 sm:px-3">
          {/* Filter row: sliders + Type + Brand */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
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

          {showMoreFilters && (
            <div className="mb-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
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
          )}

          {/* Quick type chips (horizontal) — same subcategories, fast jump */}
          {subcategories.length > 0 && (
            <div className="-mx-0.5 mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setSubFilter(null)}
                className={`flex min-w-[100px] max-w-[130px] flex-shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition ${
                  !validSub
                    ? 'border-violet-400 bg-violet-50 shadow-sm'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-gray-100">
                  {imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-gray-400">
                      All
                    </span>
                  )}
                </div>
                <span
                  className={`line-clamp-2 w-full text-[10px] leading-tight ${
                    !validSub ? 'font-bold text-violet-950' : 'font-medium text-gray-600'
                  }`}
                >
                  All
                </span>
              </button>
              {subcategories.map((sub) => {
                const thumb = categoryThumbUrl(sub);
                const active = validSub === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubFilter(sub.id)}
                    className={`flex min-w-[100px] max-w-[130px] flex-shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition ${
                      active ? 'border-violet-400 bg-violet-50 shadow-sm' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-gray-100">
                      {thumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-gray-400">
                          {sub.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span
                      className={`line-clamp-2 w-full text-[10px] leading-tight ${
                        active ? 'font-bold text-violet-950' : 'font-medium text-gray-600'
                      }`}
                    >
                      {sub.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

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
            <ProductGridSkeleton />
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
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {displayProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function CategoryBrowseFallback() {
  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)]">
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 flex-1 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-36 animate-pulse bg-gray-200 sm:h-40" />
      <div className="px-4 py-4">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

export default function CategoryBrowsePage() {
  return (
    <Suspense fallback={<CategoryBrowseFallback />}>
      <CategoryBrowseInner />
    </Suspense>
  );
}

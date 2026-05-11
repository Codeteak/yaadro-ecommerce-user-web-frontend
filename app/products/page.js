'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCategories, useCategoriesTree } from '../../hooks/useProducts';
import { useQuery } from '@tanstack/react-query';
import { getProductRating, getProductDiscount } from '../../utils/productUtils';
import { getProducts } from '../../utils/productApi';
import ProductCard from '../../components/ProductCard';
import FloatingViewCartPill from '../../components/FloatingViewCartPill';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const SORT_OPTIONS = [
  { key: 'default', label: 'Sort' },
  { key: 'price-asc', label: 'Price: low' },
  { key: 'price-desc', label: 'Price: high' },
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest' },
];

/** Category pills use display names; `GET /storefront/products` expects `category_id` as UUID only. */
const CATEGORY_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* ─────────────────────────────────────────────
   Sub-components (aligned with category browse UI)
───────────────────────────────────────────── */

function categoryThumbUrl(cat) {
  if (!cat || typeof cat.image !== 'string') return null;
  const u = cat.image.trim();
  return u.length > 0 ? u : null;
}

function CategoryRailItem({ active, label, imageUrl, onClick }) {
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

function FilterBar({ filters, onFilterToggle, sortKey, onSortChange }) {
  const sortLabel = SORT_OPTIONS.find((s) => s.key === sortKey)?.label || 'Sort';
  const sortIdx = SORT_OPTIONS.findIndex((s) => s.key === sortKey);

  const handleSortClick = () => {
    const next = SORT_OPTIONS[(sortIdx + 1) % SORT_OPTIONS.length];
    onSortChange(next.key);
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { key: 'organic', label: 'Organic', icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          )},
          { key: 'inStock', label: 'In stock', icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )},
          { key: 'onSale', label: 'On sale', icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
            </svg>
          )},
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onFilterToggle(key)}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition whitespace-nowrap ${
              filters[key]
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={handleSortClick}
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition ml-2 whitespace-nowrap ${
          sortKey !== 'default'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-300'
        }`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        {sortLabel}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function EmptyState({ onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-5v8" />
        </svg>
      </div>
      <p className="text-[14px] font-medium text-gray-700 mb-1">No products found</p>
      <p className="text-[12px] text-gray-400 mb-5">Try adjusting your filters or search query</p>
      <button
        onClick={onReset}
        className="text-[12px] font-medium text-emerald-600 hover:text-emerald-800 transition"
      >
        Clear all filters
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page content
───────────────────────────────────────────── */
function findCategoryNameInTree(nodes, idOrSlug) {
  if (!idOrSlug || idOrSlug === 'all' || !nodes?.length) return '';
  for (const n of nodes) {
    if (String(n.id) === String(idOrSlug) || (n.slug && String(n.slug) === String(idOrSlug))) {
      return String(n.name || '').trim();
    }
    const child = findCategoryNameInTree(n.children || [], idOrSlug);
    if (child) return child;
  }
  return '';
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState(
    searchParams?.get('category') || 'all'
  );
  const [filters, setFilters] = useState({
    organic: false,
    inStock: false,
    onSale: false,
  });
  const [sortKey, setSortKey] = useState('default');
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const { data: categoriesData } = useCategories();
  const { data: categoryTree = [], isLoading: treeLoading } = useCategoriesTree();

  const rootCategories = useMemo(() => {
    const rootsFromTree = (categoryTree || []).filter((c) => c && c.isActive !== false);
    if (rootsFromTree.length > 0) return rootsFromTree;
    return (categoriesData || [])
      .filter((c) => c && c.isActive !== false && c.parentId == null)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [categoryTree, categoriesData]);

  const activeCategoryLabel = useMemo(() => {
    if (activeCategory === 'all') return 'All products';
    const fromTree = findCategoryNameInTree(categoryTree, activeCategory);
    if (fromTree) return fromTree;
    const flat = (categoriesData || []).find(
      (c) => c && (String(c.id) === String(activeCategory) || String(c.slug) === String(activeCategory))
    );
    return flat?.name || 'Category';
  }, [activeCategory, categoryTree, categoriesData]);

  /* ── Sync category + search from URL ── */
  useEffect(() => {
    const cat = searchParams?.get('category');
    if (!cat) return;
    // Back-compat: older links used category name. If so, map it to the parent category UUID.
    if (!CATEGORY_ID_UUID.test(cat) && cat !== 'all') {
      const match = (categoriesData || []).find(
        (c) => c && c.parentId == null && String(c.name || '') === String(cat)
      );
      if (match?.id) {
        setActiveCategory(String(match.id));
        return;
      }
    }
    setActiveCategory(cat);
  }, [searchParams, categoriesData]);

  /* Search query comes from the global Navbar (`?search=`), not an in-page field. */
  const urlSearch = searchParams?.get('search') || '';

  const sortParams = useMemo(() => {
    const combined = urlSearch.trim();
    const q = {
      limit: 50,
      search: combined || undefined,
      availability: filters.inStock ? 'in_stock' : undefined,
    };
    if (sortKey === 'price-asc') {
      q.sort_by = 'price';
      q.sort_order = 'asc';
    } else if (sortKey === 'price-desc') {
      q.sort_by = 'price';
      q.sort_order = 'desc';
    } else if (sortKey === 'newest') {
      q.sort_by = 'created_at';
      q.sort_order = 'desc';
    }
    return q;
  }, [urlSearch, filters.inStock, sortKey]);

  // Build parent->children index from flat list and collect all descendants.
  const descendantCategoryIds = useMemo(() => {
    if (!CATEGORY_ID_UUID.test(activeCategory)) return [];
    const list = categoriesData || [];
    const childrenByParent = new Map();
    for (const c of list) {
      const pid = c?.parentId;
      const cid = c?.id;
      if (!cid) continue;
      if (pid == null) continue;
      const key = String(pid);
      const arr = childrenByParent.get(key) || [];
      arr.push(String(cid));
      childrenByParent.set(key, arr);
    }
    const out = [];
    const seen = new Set();
    const queue = [String(activeCategory)];
    while (queue.length) {
      const cur = queue.shift();
      const kids = childrenByParent.get(String(cur)) || [];
      for (const k of kids) {
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(k);
        queue.push(k);
      }
    }
    return out;
  }, [activeCategory, categoriesData]);

  const activeCategoryIdsForFetch = useMemo(() => {
    if (activeCategory === 'all') return [];
    if (!CATEGORY_ID_UUID.test(activeCategory)) return [];
    // Include the parent itself + all descendants (child categories).
    return [String(activeCategory), ...descendantCategoryIds];
  }, [activeCategory, descendantCategoryIds]);

  const { data: mergedData, isLoading } = useQuery({
    queryKey: [
      'products',
      'by-category-tree',
      activeCategoryIdsForFetch,
      sortParams,
      filters.organic,
      filters.onSale,
    ],
    queryFn: async () => {
      // No category filter: just list/search.
      if (!activeCategoryIdsForFetch.length) {
        return await getProducts(sortParams);
      }
      const results = await Promise.all(
        activeCategoryIdsForFetch.map((cid) => getProducts({ ...sortParams, category_id: cid }))
      );
      const map = new Map();
      for (const r of results) {
        for (const p of r?.products || []) {
          if (!p?.id) continue;
          if (!map.has(p.id)) map.set(p.id, p);
        }
      }
      return { products: Array.from(map.values()), pagination: { nextCursor: null } };
    },
    staleTime: 1000 * 60 * 2,
  });

  const products = mergedData?.products || [];

  /* ── Client sort: rating only (API has no ratings sort) ── */
  const sorted = [...products].sort((a, b) => {
    if (sortKey === 'rating') return getProductRating(b) - getProductRating(a);
    return 0;
  });

  /* ── Client filters: organic, on sale, named category pills (non-UUID) ── */
  const filtered = sorted.filter((p) => {
    if (filters.organic && !p.organicTag) return false;
    if (filters.onSale) {
      const disc = getProductDiscount(p);
      if (!disc || disc <= 0) return false;
    }
    if (activeCategory !== 'all' && !CATEGORY_ID_UUID.test(activeCategory)) {
      if (String(p.category || '') !== activeCategory) return false;
    }
    return true;
  });

  const displayProducts = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        String(p.category || '')
          .toLowerCase()
          .includes(q)
    );
  }, [filtered, localSearch]);

  useEffect(() => {
    setLocalSearch('');
  }, [activeCategory]);

  const showRailSkeleton = treeLoading && rootCategories.length === 0;

  const handleFilterToggle = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    setActiveCategory('all');
    setFilters({ organic: false, inStock: false, onSale: false });
    setSortKey('default');
    router.replace('/products');
  };

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    if (cat === 'all') {
      router.replace('/products');
    } else {
      router.replace(`/products?category=${encodeURIComponent(cat)}`);
    }
  };

  if (showRailSkeleton) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)]">
        <div className="sticky top-0 z-40 border-b border-gray-100 bg-white px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
            <div className="h-5 flex-1 animate-pulse rounded bg-gray-200" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
        <div className="flex w-full max-w-screen-2xl flex-row">
          <aside className="w-[76px] shrink-0 border-r border-gray-200 bg-white py-2 sm:w-[80px]">
            <div className="space-y-2 px-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mx-auto h-12 w-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-2.5 py-3 sm:px-3">
            <ProductGridSkeleton />
          </main>
        </div>
        <FloatingViewCartPill />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)]">
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
            Products
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
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search in results…"
                className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-[13px] text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-screen-2xl flex-row">
        <aside
          className="sticky z-30 w-[76px] shrink-0 self-start border-r border-gray-200 bg-white py-2 sm:w-[80px] top-[calc(52px+env(safe-area-inset-top,0px))]"
          style={{
            maxHeight:
              'calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 52px)',
          }}
        >
          <div className="flex max-h-[inherit] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1.5 pb-4">
            <CategoryRailItem
              active={activeCategory === 'all'}
              label="All"
              imageUrl={null}
              onClick={() => handleCategorySelect('all')}
            />
            {rootCategories.map((cat) => {
              const id = String(cat.id || '').trim();
              if (!id) return null;
              return (
                <CategoryRailItem
                  key={id}
                  active={activeCategory === id}
                  label={String(cat.name || '').trim() || 'Category'}
                  imageUrl={categoryThumbUrl(cat)}
                  onClick={() => handleCategorySelect(id)}
                />
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-gray-50 px-2.5 py-3 sm:px-3">
          <div className="mb-3">
            <FilterBar
              filters={filters}
              onFilterToggle={handleFilterToggle}
              sortKey={sortKey}
              onSortChange={setSortKey}
            />
          </div>

          {!isLoading && (
            <p className="mb-2 text-[11px] text-gray-400">
              {activeCategoryLabel}
              {displayProducts.length > 0
                ? ` · ${displayProducts.length} product${displayProducts.length !== 1 ? 's' : ''}`
                : localSearch.trim()
                  ? ' · No matches'
                  : ' · No products'}
            </p>
          )}

          {isLoading ? (
            <ProductGridSkeleton />
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
              <EmptyState onReset={handleReset} />
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

      <FloatingViewCartPill />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page export
───────────────────────────────────────────── */
export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="grid grid-cols-2 gap-3 px-4 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="w-full aspect-square bg-gray-100" />
                <div className="p-2.5 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-4/5" />
                  <div className="h-3 bg-gray-100 rounded-full w-3/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
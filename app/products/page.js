'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCategories } from '../../hooks/useProducts';
import { useQuery } from '@tanstack/react-query';
import { getProductRating, getProductDiscount } from '../../utils/productUtils';
import { getProducts } from '../../utils/productApi';
import ProductCard from '../../components/ProductCard';

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
   Sub-components
───────────────────────────────────────────── */

function CategoryPills({ activeCategory, onSelect, categories }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2.5 bg-white border-b border-gray-100 scrollbar-hide">
      {[{ key: 'all', label: 'All' }, ...(categories || [])].map((cat) => (
        <button
          key={cat.key}
          onClick={() => onSelect(cat.key)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-medium border transition whitespace-nowrap ${
            activeCategory === cat.key
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-300'
          }`}
        >
          {cat.label}
        </button>
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
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
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
   Skeleton card (loading)
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-100" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-4/5" />
        <div className="h-3 bg-gray-100 rounded-full w-3/5" />
        <div className="h-4 bg-gray-100 rounded-full w-2/5 mt-3" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function EmptyState({ onReset }) {
  return (
    <div className="col-span-2 flex flex-col items-center justify-center py-16 px-6 text-center">
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

  const { data: categoriesData } = useCategories();
  const parentCategoryPills = useMemo(() => {
    const parents =
      (categoriesData || [])
        .filter((c) => c && c.isActive !== false && c.parentId == null)
        .map((c) => ({
          key: String(c.id || '').trim(),
          label: String(c.name || '').trim(),
        }))
        .filter((c) => c.key && c.key !== 'all');
    // Stable ordering
    parents.sort((a, b) => a.label.localeCompare(b.label));
    return parents;
  }, [categoriesData]);

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

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">

      {/* ── Category pills ── */}
      <CategoryPills
        activeCategory={activeCategory}
        onSelect={handleCategorySelect}
        categories={parentCategoryPills}
      />

      {/* ── Filter + sort bar ── */}
      <FilterBar
        filters={filters}
        onFilterToggle={handleFilterToggle}
        sortKey={sortKey}
        onSortChange={setSortKey}
      />

      {/* ── Results count ── */}
      {!isLoading && (
        <p className="px-4 py-2 text-[11px] text-gray-400">
          {filtered.length > 0
            ? `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`
            : 'No products found'}
        </p>
      )}

      {/* ── Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pb-8">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
          ? <EmptyState onReset={handleReset} />
          : filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
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
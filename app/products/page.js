'use client';

import { useState, useEffect, useMemo, useCallback, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCategories, useCategoriesTree } from '../../hooks/useProducts';
import FloatingViewCartPill from '../../components/FloatingViewCartPill';
import ProductsCategoryRail from '../../components/products/ProductsCategoryRail';
import ProductsListingPanel from '../../components/products/ProductsListingPanel';
import { CATEGORY_ID_UUID } from '../../components/products/productsBrowseConstants';

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
  const [isCategoryPending, startCategoryTransition] = useTransition();

  const [activeCategory, setActiveCategory] = useState(
    searchParams?.get('category') || 'all'
  );
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

  useEffect(() => {
    const cat = searchParams?.get('category');
    if (!cat) return;
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

  const urlSearch = searchParams?.get('search') || '';

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
    return [String(activeCategory), ...descendantCategoryIds];
  }, [activeCategory, descendantCategoryIds]);

  useEffect(() => {
    setLocalSearch('');
  }, [activeCategory]);

  const showRailSkeleton = treeLoading && rootCategories.length === 0;

  const handleCategorySelect = useCallback(
    (cat) => {
      startCategoryTransition(() => {
        setActiveCategory(cat);
        if (cat === 'all') {
          router.replace('/products', { scroll: false });
        } else {
          router.replace(`/products?category=${encodeURIComponent(cat)}`, { scroll: false });
        }
      });
    },
    [router]
  );

  const onResetBrowse = useCallback(() => {
    setActiveCategory('all');
    router.replace('/products', { scroll: false });
  }, [router]);

  const onBack = useCallback(() => router.back(), [router]);
  const onSearchOpenToggle = useCallback(() => setSearchOpen((v) => !v), []);

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
            onClick={onBack}
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
            onClick={onSearchOpenToggle}
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
        <ProductsCategoryRail
          activeCategory={activeCategory}
          rootCategories={rootCategories}
          onCategorySelect={handleCategorySelect}
        />
        <ProductsListingPanel
          activeCategory={activeCategory}
          activeCategoryLabel={activeCategoryLabel}
          activeCategoryIdsForFetch={activeCategoryIdsForFetch}
          urlSearch={urlSearch}
          localInResultsSearch={localSearch}
          onResetBrowse={onResetBrowse}
          isPending={isCategoryPending}
        />
      </div>

      <FloatingViewCartPill />
    </div>
  );
}

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

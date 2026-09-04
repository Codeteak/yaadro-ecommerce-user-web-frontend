'use client';

import { useState, useEffect, useMemo, useCallback, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCategoriesTree } from '../../hooks/useProducts';
import FloatingViewCartPill from '../../components/FloatingViewCartPill';
import ProductsCategoryRail from '../../components/products/ProductsCategoryRail';
import ProductsListingPanel from '../../components/products/ProductsListingPanel';
import { CATEGORY_ID_UUID } from '../../components/products/productsBrowseConstants';
import ProductsPageSkeleton from '../../components/skeletons/ProductsPageSkeleton';

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

function flattenCategoryTree(nodes) {
  if (!nodes?.length) return [];
  const out = [];
  for (const node of nodes) {
    out.push(node);
    if (node.children?.length) out.push(...flattenCategoryTree(node.children));
  }
  return out;
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

  const { data: categoryTree = [], isLoading: treeLoading } = useCategoriesTree();
  const categoriesData = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);

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

  const activeCategoryId = useMemo(() => {
    if (activeCategory === 'all') return '';
    if (!CATEGORY_ID_UUID.test(activeCategory)) return '';
    return String(activeCategory);
  }, [activeCategory]);

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
      <>
        <ProductsPageSkeleton />
        <FloatingViewCartPill />
      </>
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
          categoryId={activeCategoryId}
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
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}

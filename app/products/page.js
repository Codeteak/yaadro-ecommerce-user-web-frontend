'use client';

import { useState, useEffect, useMemo, useCallback, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCategoriesTree } from '../../hooks/useProducts';
import ProductsCategoryRail from '../../components/products/ProductsCategoryRail';
import ProductsListingPanel, { FilterBar } from '../../components/products/ProductsListingPanel';
import {
  CATEGORY_ID_UUID,
  isAllCategorySentinel,
  isAllNamedCategory,
} from '../../components/products/productsBrowseConstants';
import ProductsPageSkeleton from '../../components/skeletons/ProductsPageSkeleton';
import BrowsePageHeader from '../../components/BrowsePageHeader';

function findCategoryInTree(nodes, idOrSlug) {
  if (!idOrSlug || isAllCategorySentinel(idOrSlug) || !nodes?.length) return null;
  for (const n of nodes) {
    if (String(n.id) === String(idOrSlug) || (n.slug && String(n.slug) === String(idOrSlug))) {
      return n;
    }
    const child = findCategoryInTree(n.children || [], idOrSlug);
    if (child) return child;
  }
  return null;
}

function findParentInTree(nodes, idOrSlug, parent = null) {
  if (!idOrSlug || !nodes?.length) return null;
  for (const n of nodes) {
    if (String(n.id) === String(idOrSlug) || (n.slug && String(n.slug) === String(idOrSlug))) {
      return parent;
    }
    const found = findParentInTree(n.children || [], idOrSlug, n);
    if (found) return found;
  }
  return null;
}

function findCategoryNameInTree(nodes, idOrSlug) {
  const node = findCategoryInTree(nodes, idOrSlug);
  return node?.name ? String(node.name).trim() : '';
}

function normalizeCategoryParam(raw) {
  if (!raw || isAllCategorySentinel(raw)) return 'all';
  return String(raw);
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

function activeChildrenOf(category) {
  return (category?.children || []).filter((c) => c && c.isActive !== false);
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isCategoryPending, startCategoryTransition] = useTransition();

  const [activeCategory, setActiveCategory] = useState(() =>
    normalizeCategoryParam(searchParams?.get('category'))
  );
  /** Root whose children are expanded inline under it in the same rail. */
  const [expandedRootId, setExpandedRootId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [filters, setFilters] = useState({
    organic: false,
    inStock: false,
    onSale: false,
  });
  const [sortKey, setSortKey] = useState('default');

  const { data: categoryTree = [], isLoading: treeLoading } = useCategoriesTree();
  const categoriesData = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);

  const rootCategories = useMemo(() => {
    const rootsFromTree = (categoryTree || []).filter(
      (c) => c && c.isActive !== false && !isAllNamedCategory(c)
    );
    if (rootsFromTree.length > 0) return rootsFromTree;
    return (categoriesData || [])
      .filter(
        (c) =>
          c && c.isActive !== false && c.parentId == null && !isAllNamedCategory(c)
      )
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [categoryTree, categoriesData]);

  const activeCategoryLabel = useMemo(() => {
    if (isAllCategorySentinel(activeCategory)) return 'All products';
    const fromTree = findCategoryNameInTree(categoryTree, activeCategory);
    if (fromTree) return fromTree;
    const flat = (categoriesData || []).find(
      (c) => c && (String(c.id) === String(activeCategory) || String(c.slug) === String(activeCategory))
    );
    return flat?.name || 'Category';
  }, [activeCategory, categoryTree, categoriesData]);

  const resolveAndApplyCategory = useCallback(
    (cat) => {
      if (!cat || isAllCategorySentinel(cat)) {
        setActiveCategory('all');
        setExpandedRootId(null);
        return;
      }

      const fromTree = findCategoryInTree(categoryTree, cat);
      let id = fromTree?.id
        ? String(fromTree.id)
        : CATEGORY_ID_UUID.test(cat)
          ? cat
          : '';

      if (!id) {
        const match = (categoriesData || []).find(
          (c) =>
            c &&
            !isAllNamedCategory(c) &&
            (String(c.name || '') === String(cat) || String(c.slug || '') === String(cat))
        );
        if (match?.id) id = String(match.id);
      }

      if (!id) {
        setActiveCategory(cat);
        return;
      }

      setActiveCategory(id);
      const node = fromTree || findCategoryInTree(categoryTree, id);
      const parent = findParentInTree(categoryTree, id);
      if (parent?.id) {
        setExpandedRootId(String(parent.id));
      } else if (node && activeChildrenOf(node).length > 0) {
        setExpandedRootId(id);
      } else {
        setExpandedRootId(null);
      }
    },
    [categoryTree, categoriesData]
  );

  useEffect(() => {
    resolveAndApplyCategory(searchParams?.get('category'));
  }, [searchParams, resolveAndApplyCategory]);

  const urlSearch = searchParams?.get('search') || '';

  const activeCategoryId = useMemo(() => {
    if (isAllCategorySentinel(activeCategory)) return '';
    if (!CATEGORY_ID_UUID.test(activeCategory)) return '';
    return String(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    setLocalSearch('');
  }, [activeCategory]);

  const showRailSkeleton = treeLoading && rootCategories.length === 0;

  const navigateToCategory = useCallback(
    (next) => {
      startCategoryTransition(() => {
        const value = isAllCategorySentinel(next) ? 'all' : next;
        setActiveCategory(value);
        if (value === 'all') {
          setExpandedRootId(null);
          router.replace('/products', { scroll: false });
        } else {
          router.replace(`/products?category=${encodeURIComponent(value)}`, { scroll: false });
        }
      });
    },
    [router]
  );

  const handleCategorySelect = useCallback(
    (catId) => {
      const node = findCategoryInTree(categoryTree, catId);
      const children = activeChildrenOf(node);
      const parent = findParentInTree(categoryTree, catId);

      // Child chip under an expanded root.
      if (parent?.id) {
        setExpandedRootId(String(parent.id));
        navigateToCategory(catId);
        return;
      }

      // Root with children: expand inline under parent (toggle if already expanded + selected).
      if (children.length > 0) {
        const already =
          String(expandedRootId) === String(catId) && String(activeCategory) === String(catId);
        if (already) {
          setExpandedRootId(null);
          navigateToCategory('all');
          return;
        }
        setExpandedRootId(String(catId));
        navigateToCategory(catId);
        return;
      }

      setExpandedRootId(null);
      navigateToCategory(catId);
    },
    [categoryTree, expandedRootId, activeCategory, navigateToCategory]
  );

  const handleSelectAll = useCallback(() => {
    setExpandedRootId(null);
    navigateToCategory('all');
  }, [navigateToCategory]);

  const onResetBrowse = useCallback(() => {
    setExpandedRootId(null);
    navigateToCategory('all');
  }, [navigateToCategory]);

  const onBack = useCallback(() => router.back(), [router]);
  const onSearchOpenToggle = useCallback(() => setSearchOpen((v) => !v), []);
  const onFilterToggle = useCallback((key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const onClearFilters = useCallback(() => {
    setFilters({ organic: false, inStock: false, onSale: false });
    setSortKey('default');
  }, []);

  if (showRailSkeleton) {
    return <ProductsPageSkeleton />;
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)]">
      <BrowsePageHeader
        title="Products"
        searchOpen={searchOpen}
        onBack={onBack}
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
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search in results…"
              className="h-10 w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 text-[13px] text-gray-900 caret-[#902bf5] placeholder-gray-400 outline-none transition-[border-color,box-shadow] duration-200 ease-out focus:border-[#902bf5] focus:shadow-[0_0_0_3px_rgba(144,43,245,0.18)]"
              autoFocus
            />
          </div>
        }
        toolbar={
          <FilterBar
            filters={filters}
            onFilterToggle={onFilterToggle}
            sortKey={sortKey}
            onSortChange={setSortKey}
          />
        }
      />

      <div className="mx-auto flex w-full max-w-screen-2xl flex-row">
        <ProductsCategoryRail
          activeCategory={activeCategory}
          rootCategories={rootCategories}
          expandedRootId={expandedRootId}
          onSelectAll={handleSelectAll}
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
          filters={filters}
          onFilterToggle={onFilterToggle}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onClearFilters={onClearFilters}
        />
      </div>
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

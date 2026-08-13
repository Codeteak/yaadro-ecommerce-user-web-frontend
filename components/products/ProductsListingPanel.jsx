'use client';

import { useState, useMemo, memo, useEffect, useRef } from 'react';
import { useInfiniteProducts } from '../../hooks/useProducts';
import { getProductRating, getProductDiscount } from '../../utils/productUtils';
import ProductCard from '../ProductCard';
import InfiniteScrollSentinel from '../InfiniteScrollSentinel';
import { CATEGORY_ID_UUID, SORT_OPTIONS } from './productsBrowseConstants';
import { ProductGridSkeleton } from '../skeletons/primitives';

const PRODUCTS_SCROLL_KEY = 'yaadro_products_scroll_v1';

function FilterBar({ filters, onFilterToggle, sortKey, onSortChange, disabled }) {
  const sortLabel = SORT_OPTIONS.find((s) => s.key === sortKey)?.label || 'Sort';
  const sortIdx = SORT_OPTIONS.findIndex((s) => s.key === sortKey);

  const handleSortClick = () => {
    if (disabled) return;
    const next = SORT_OPTIONS[(sortIdx + 1) % SORT_OPTIONS.length];
    onSortChange(next.key);
  };

  return (
    <div
      className={`flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-sm ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          {
            key: 'organic',
            label: 'Organic',
            icon: (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                />
              </svg>
            ),
          },
          {
            key: 'inStock',
            label: 'In stock',
            icon: (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ),
          },
          {
            key: 'onSale',
            label: 'On sale',
            icon: (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z"
                />
              </svg>
            ),
          },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
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
        type="button"
        disabled={disabled}
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

function EmptyState({ onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-5v8"
          />
        </svg>
      </div>
      <p className="mb-1 text-[14px] font-medium text-gray-700">No products found</p>
      <p className="mb-5 text-[12px] text-gray-400">Try adjusting your filters or search query</p>
      <button
        type="button"
        onClick={onReset}
        className="text-[12px] font-medium text-emerald-600 transition hover:text-emerald-800"
      >
        Clear all filters
      </button>
    </div>
  );
}

function ProductsListingPanelInner({
  activeCategory,
  activeCategoryLabel,
  categoryId,
  urlSearch,
  localInResultsSearch,
  onResetBrowse,
  isPending,
}) {
  const [filters, setFilters] = useState({
    organic: false,
    inStock: false,
    onSale: false,
  });
  const [sortKey, setSortKey] = useState('default');
  const restoredScrollRef = useRef(false);

  const infiniteParams = useMemo(() => {
    const combined = urlSearch.trim();
    const q = {
      limit: 24,
      category_id: categoryId || undefined,
      search: combined || undefined,
      availability: filters.inStock ? 'in_stock' : undefined,
    };
    if (sortKey === 'price-asc') {
      q.sort_by = 'price';
      q.sort_order = 'asc';
    } else if (sortKey === 'price-desc') {
      q.sort_by = 'price';
      q.sort_order = 'desc';
    } else if (sortKey === 'newest' || sortKey === 'default') {
      q.sort_by = 'created_at';
      q.sort_order = 'desc';
    }
    return q;
  }, [urlSearch, filters.inStock, sortKey, categoryId]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteProducts(infiniteParams);

  const products = useMemo(
    () => (data?.pages || []).flatMap((p) => p?.products || []),
    [data?.pages]
  );

  const sorted = useMemo(() => {
    const list = [...products];
    if (sortKey === 'rating') {
      list.sort((a, b) => getProductRating(b) - getProductRating(a));
    }
    return list;
  }, [products, sortKey]);

  const filtered = useMemo(() => {
    return sorted.filter((p) => {
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
  }, [sorted, filters.organic, filters.onSale, activeCategory]);

  const displayProducts = useMemo(() => {
    const q = localInResultsSearch.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        String(p.category || '')
          .toLowerCase()
          .includes(q)
    );
  }, [filtered, localInResultsSearch]);

  // Restore scroll after returning from PDP
  useEffect(() => {
    if (isLoading || restoredScrollRef.current) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(PRODUCTS_SCROLL_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const browseKey = `${categoryId || 'all'}|${urlSearch || ''}`;
      if (!saved || saved.browseKey !== browseKey) return;
      restoredScrollRef.current = true;
      sessionStorage.removeItem(PRODUCTS_SCROLL_KEY);
      requestAnimationFrame(() => {
        window.scrollTo(0, Number(saved.y) || 0);
      });
    } catch {
      // ignore
    }
  }, [isLoading, categoryId, urlSearch, displayProducts.length]);

  // Persist scroll before leaving for PDP (capture phase on product links)
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target?.closest?.('a[href*="/products/"]');
      if (!a || typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(
          PRODUCTS_SCROLL_KEY,
          JSON.stringify({
            browseKey: `${categoryId || 'all'}|${urlSearch || ''}`,
            y: window.scrollY || 0,
          })
        );
      } catch {
        // ignore
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [categoryId, urlSearch]);

  const handleFilterToggle = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    setFilters({ organic: false, inStock: false, onSale: false });
    setSortKey('default');
    onResetBrowse();
  };

  return (
    <main
      className={`min-w-0 flex-1 bg-gray-50 px-2.5 py-3 transition-opacity duration-200 sm:px-3 ${
        isPending ? 'opacity-60' : 'opacity-100'
      }`}
      aria-busy={isPending || isLoading}
    >
      <div className="mb-3">
        <FilterBar
          filters={filters}
          onFilterToggle={handleFilterToggle}
          sortKey={sortKey}
          onSortChange={setSortKey}
          disabled={isLoading}
        />
      </div>

      {!isLoading && (
        <p className="mb-2 text-[11px] text-gray-400">
          {activeCategoryLabel}
          {displayProducts.length > 0
            ? ` · ${displayProducts.length} product${displayProducts.length !== 1 ? 's' : ''}`
            : localInResultsSearch.trim()
              ? ' · No matches'
              : ' · No products'}
        </p>
      )}

      {isLoading ? (
        <ProductGridSkeleton count={8} variant="products" />
      ) : displayProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
          <EmptyState onReset={handleReset} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {!localInResultsSearch.trim() && (
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
  );
}

const ProductsListingPanel = memo(ProductsListingPanelInner);
export default ProductsListingPanel;

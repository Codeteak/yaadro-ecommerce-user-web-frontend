'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCategoriesTree, useSearchProducts, useProducts } from '../../hooks/useProducts';
import ProductCarousel from '../../components/ProductCarousel';
import { getResolvedProductImageUrls } from '../../utils/productImages';
import { getProductDetailPath, toDisplayText } from '../../utils/productApi';
import { navigateToProductDetail } from '../../utils/productNavigation';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../../utils/categoryImage';
import { CategoryCardSkeleton } from '../../components/skeletons/primitives';
import ProductImageWithFallback from '../../components/ProductImageWithFallback';
import BrowsePageHeader from '../../components/BrowsePageHeader';
import { productsCategoryHref } from '../../components/products/productsBrowseConstants';

/** Rotating hint (same UX as header search). */
const FALLBACK_HINT_WORDS = [
  'milk',
  'vegetables',
  'fruits',
  'rice',
  'atta & flour',
  'cooking oil',
  'snacks',
  'biscuits',
  'spices & masala',
  'tea & coffee',
];
const SEARCH_HINT_SLIDE_MS = 2800;
const SEARCH_HINT_TRANSITION_MS = 500;

function RotatingHintInput({ value, onChange, hintWords, inputProps }) {
  const slideWords = [...hintWords, hintWords[0]];
  const [slideIndex, setSlideIndex] = useState(0);
  const [hintNoTransition, setHintNoTransition] = useState(false);
  const empty = !String(value || '').trim();

  useEffect(() => {
    if (!empty) return undefined;
    const id = setInterval(() => {
      setSlideIndex((i) => i + 1);
    }, SEARCH_HINT_SLIDE_MS);
    return () => clearInterval(id);
  }, [empty]);

  useEffect(() => {
    if (slideIndex < hintWords.length) return undefined;
    const t = setTimeout(() => {
      setHintNoTransition(true);
      setSlideIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHintNoTransition(false));
      });
    }, SEARCH_HINT_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [slideIndex, hintWords.length]);

  return (
    <div className="relative min-w-0 flex-1">
      {empty && hintWords.length > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center text-[13px] text-gray-500"
          aria-hidden
        >
          <span className="shrink-0">Search for</span>
          <span className="relative ml-px inline-block h-[1.25em] overflow-hidden">
            <div
              className={
                hintNoTransition
                  ? ''
                  : 'transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]'
              }
              style={{
                transform: `translateY(calc(${-slideIndex} * 1.25em))`,
              }}
            >
              {slideWords.map((word, i) => (
                <div
                  key={`${word}-${i}`}
                  className="h-[1.25em] leading-[1.25em] whitespace-nowrap"
                >
                  {` "${word}"`}
                </div>
              ))}
            </div>
          </span>
        </div>
      )}
      <input
        {...inputProps}
        value={value}
        onChange={onChange}
        placeholder=""
        autoComplete="off"
        className={`relative z-10 w-full border-0 bg-transparent outline-none text-[13px] caret-[#902bf5] ${
          empty ? 'text-transparent' : 'text-gray-900'
        } ${inputProps?.className || ''}`}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Category card → dedicated category browse page
   Blinkit-style: light tile + label below (no section grouping)
───────────────────────────────────────────── */
function CategoryCard({ category, featured = false }) {
  const imageUrl = getCategoryImageUrl(category);
  const [imgSrc, setImgSrc] = useState(imageUrl || CATEGORY_DUMMY_IMAGE);
  const isDummy = imgSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <Link
      href={productsCategoryHref(category)}
      className={`flex flex-col items-center gap-1.5 select-none active:scale-[0.97] transition-transform ${
        featured ? 'col-span-2' : ''
      }`}
    >
      <div
        className={`category-page-tile relative w-full overflow-hidden rounded-2xl bg-[#F2F3F5] ${
          featured ? 'aspect-[2/1.05]' : 'aspect-square'
        }`}
      >
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          className={
            isDummy
              ? 'category-page-tile-contain absolute inset-0 h-full w-full object-contain object-center p-2 sm:p-2.5'
              : 'category-page-tile-cover absolute inset-0 h-full w-full object-cover object-center'
          }
          onError={() => {
            if (!isDummy) setImgSrc(CATEGORY_DUMMY_IMAGE);
          }}
        />
      </div>
      <p
        className={`w-full px-0.5 text-center text-[11px] font-bold leading-snug text-gray-900 sm:text-[12px] ${
          featured ? 'line-clamp-2' : 'line-clamp-2'
        }`}
      >
        {category.name}
      </p>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function CategoriesPage() {
  const router = useRouter();
  const { data: categoryTree = [], isLoading } = useCategoriesTree();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const onSearchOpenToggle = useCallback(() => setSearchOpen((v) => !v), []);

  const { data: newArrivalsData } = useProducts({
    limit: 14,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const { data: valuePicksData } = useProducts({
    limit: 24,
    sort_by: 'price',
    sort_order: 'asc',
  });

  const newArrivalsProducts = useMemo(
    () => newArrivalsData?.products?.slice(0, 14) || [],
    [newArrivalsData?.products]
  );
  const valuePickProducts = useMemo(() => {
    const pool = valuePicksData?.products || [];
    const skip = new Set(newArrivalsProducts.map((p) => p.id));
    return pool.filter((p) => !skip.has(p.id)).slice(0, 14);
  }, [valuePicksData?.products, newArrivalsProducts]);

  const rootCategories = (categoryTree || []).filter(
    (cat) => cat.isActive !== false && (cat.level === 0 || cat.parentId == null)
  );

  const q = search.trim();
  const { data: productSearchData, isLoading: productSearchLoading } = useSearchProducts({
    q,
    page: 1,
    per_page: 8,
  });
  const productMatches = q.length >= 2 ? productSearchData?.products || [] : [];

  const hintWords = useMemo(() => {
    const words = (rootCategories || [])
      .map((c) => String(c?.name || '').trim())
      .filter(Boolean)
      .slice(0, 12);
    return words.length ? words : FALLBACK_HINT_WORDS;
  }, [rootCategories]);

  const filtered = search.trim()
    ? rootCategories.filter((cat) => {
        const q = search.toLowerCase();
        if (cat.name.toLowerCase().includes(q)) return true;
        return (cat.children || []).some((c) => c.name.toLowerCase().includes(q));
      })
    : rootCategories;

  return (
    <div className="min-h-screen bg-white w-full max-w-full pb-28 pt-[env(safe-area-inset-top,0px)]">
      <BrowsePageHeader
        title="Categories"
        searchOpen={searchOpen}
        onBack={handleBack}
        onSearchToggle={onSearchOpenToggle}
        searchAriaLabel="Search categories"
        searchSlot={
          <div className="group flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 transition-[border-color,box-shadow] duration-200 ease-out focus-within:border-[#902bf5] focus-within:shadow-[0_0_0_3px_rgba(144,43,245,0.18)]">
            <svg
              className="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors duration-200 ease-out group-focus-within:text-[#902bf5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <RotatingHintInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              hintWords={hintWords}
              inputProps={{
                type: 'search',
                'aria-label': 'Search categories',
                autoFocus: true,
              }}
            />
          </div>
        }
      />

      {/* Continuous category grid (no section headers) */}
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-4 px-4 pt-4 sm:gap-x-3 sm:gap-y-5">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <CategoryCardSkeleton key={i} featured={i === 0} />
            ))
          : filtered.length === 0
          ? (
            <div className="col-span-4 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-gray-700 mb-1">No categories found</p>
              <button
                onClick={() => setSearch('')}
                className="text-[12px] text-violet-600 font-medium hover:text-violet-800 transition"
              >
                Clear search
              </button>
            </div>
          )
          : filtered.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                featured={index === 0 && !search.trim()}
              />
            ))
        }
      </div>

      {/* Product carousels */}
      {newArrivalsProducts.length > 0 && (
        <section className="mt-8 px-4" aria-label="New arrivals">
          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
              New arrivals
            </h2>
            <p className="mt-2 text-[13px] md:text-sm text-gray-500">
              Recently added products across the store.
            </p>
          </div>
          <ProductCarousel products={newArrivalsProducts} showMoreLink="/products" />
        </section>
      )}

      {valuePickProducts.length > 0 && (
        <section className="mt-8 px-4" aria-label="Great value picks">
          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
              Great value picks
            </h2>
            <p className="mt-2 text-[13px] md:text-sm text-gray-500">
              Lower-priced essentials to fill your basket.
            </p>
          </div>
          <ProductCarousel products={valuePickProducts} showMoreLink="/products" />
        </section>
      )}

      {/* Matching products (based on keywords) */}
      {q.length >= 2 && (
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
              Matching products
            </p>
            {productMatches.length > 0 && (
              <Link
                href={`/products?search=${encodeURIComponent(q)}`}
                className="text-[12px] font-medium text-violet-700 hover:text-violet-800"
              >
                View all
              </Link>
            )}
          </div>

          {productSearchLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[66px] rounded-2xl border border-gray-100 bg-white animate-pulse"
                />
              ))}
            </div>
          ) : productMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-4 text-center">
              <p className="text-[13px] font-medium text-gray-700">No products found</p>
              <p className="mt-1 text-[12px] text-gray-400">
                Try a different keyword.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {productMatches.map((p) => {
                const img = getResolvedProductImageUrls(p)[0];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const path = getProductDetailPath(p);
                      if (path === '/products/') return;
                      navigateToProductDetail(router, path);
                    }}
                    className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3.5 py-3 text-left hover:border-gray-200 active:scale-[0.99] transition"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                      <ProductImageWithFallback
                        src={img}
                        alt={toDisplayText(p?.name) || 'Product'}
                        fill
                        className="object-contain"
                        sizes="48px"
                        placeholderName={toDisplayText(p?.name) || ''}
                        placeholderCategory={toDisplayText(p?.categoryName || p?.category)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-gray-900 truncate">
                        {toDisplayText(p?.name) || 'Product'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                        {toDisplayText(p?.categoryName || p?.category)}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View all products CTA */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 mt-6 mb-2">
          <Link
            href="/products"
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#902bf5]/30 bg-[#902bf5]/12 px-5 text-[14px] font-extrabold tracking-wide text-[#902bf5] shadow-[0_8px_20px_rgba(144,43,245,0.12)] transition hover:bg-[#902bf5]/18 hover:border-[#902bf5]/45 active:scale-[0.98]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            View all products
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
</div>
  );
}
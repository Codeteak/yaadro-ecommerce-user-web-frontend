'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCategoriesTree, useSearchProducts } from '../../hooks/useProducts';
import { getResolvedProductImageUrls } from '../../utils/productImages';

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
        className={`relative z-10 w-full border-0 bg-transparent outline-none text-[13px] caret-gray-900 ${
          empty ? 'text-transparent' : 'text-gray-900'
        } ${inputProps?.className || ''}`}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Color map — matched by category name keywords
───────────────────────────────────────────── */
const COLOR_MAP = [
  { keywords: ['oil', 'fat'],                                         bg: '#EAF3DE', stroke: '#3B6D11' },
  { keywords: ['dairy', 'ghee', 'milk', 'butter', 'cheese', 'paneer'], bg: '#E6F1FB', stroke: '#185FA5' },
  { keywords: ['grain', 'flour', 'rice', 'wheat', 'millet', 'cereal'], bg: '#FAEEDA', stroke: '#854F0B' },
  { keywords: ['spice', 'herb', 'masala', 'salt', 'pepper', 'turmeric'], bg: '#FCEBEB', stroke: '#A32D2D' },
  { keywords: ['snack', 'muesli', 'granola', 'biscuit', 'chip'],      bg: '#EEEDFE', stroke: '#534AB7' },
  { keywords: ['beverage', 'tea', 'coffee', 'juice', 'drink'],        bg: '#E1F5EE', stroke: '#0F6E56' },
  { keywords: ['fruit', 'vegetable', 'fresh', 'organic'],             bg: '#EAF3DE', stroke: '#3B6D11' },
  { keywords: ['sweet', 'candy', 'chocolate', 'dessert'],             bg: '#FBEAF0', stroke: '#993556' },
];

function getCategoryColor(name = '') {
  const lower = name.toLowerCase();
  const match = COLOR_MAP.find((c) => c.keywords.some((k) => lower.includes(k)));
  return match || { bg: '#F1EFE8', stroke: '#5F5E5A' };
}

/* ─────────────────────────────────────────────
   Category icon (SVG matched by name)
───────────────────────────────────────────── */
function CategoryIcon({ name, strokeColor }) {
  const lower = (name || '').toLowerCase();
  const p = { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.8 };

  if (lower.includes('oil') || lower.includes('fat'))
    return <svg className="w-[22px] h-[22px]" fill="none" stroke={strokeColor} viewBox="0 0 24 24"><path {...p} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>;
  if (lower.includes('dairy') || lower.includes('ghee') || lower.includes('milk'))
    return <svg className="w-[22px] h-[22px]" fill="none" stroke={strokeColor} viewBox="0 0 24 24"><path {...p} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>;
  if (lower.includes('grain') || lower.includes('flour') || lower.includes('rice') || lower.includes('wheat'))
    return <svg className="w-[22px] h-[22px]" fill="none" stroke={strokeColor} viewBox="0 0 24 24"><path {...p} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>;
  if (lower.includes('spice') || lower.includes('herb') || lower.includes('masala'))
    return <svg className="w-[22px] h-[22px]" fill="none" stroke={strokeColor} viewBox="0 0 24 24"><path {...p} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>;
  if (lower.includes('snack') || lower.includes('muesli') || lower.includes('granola'))
    return <svg className="w-[22px] h-[22px]" fill="none" stroke={strokeColor} viewBox="0 0 24 24"><path {...p} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21l-3-9H6l-3 9"/></svg>;
  if (lower.includes('beverage') || lower.includes('tea') || lower.includes('coffee') || lower.includes('drink'))
    return <svg className="w-[22px] h-[22px]" fill="none" stroke={strokeColor} viewBox="0 0 24 24"><path {...p} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
  return <svg className="w-[22px] h-[22px]" fill="none" stroke={strokeColor} viewBox="0 0 24 24"><path {...p} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>;
}

/* ─────────────────────────────────────────────
   Category card → dedicated category browse page
───────────────────────────────────────────── */
function CategoryCard({ category }) {
  const { bg, stroke } = getCategoryColor(category.name);
  const productCount = category.productCount ?? category._count?.products ?? 0;
  const categorySlugOrId = category.slug || category.id;

  const imageUrl =
    typeof category.image === 'string' && category.image.trim().length > 0
      ? category.image.trim()
      : null;
  const onImage = !!imageUrl;

  return (
    <Link
      href={`/categories/${encodeURIComponent(categorySlugOrId)}`}
      className="block bg-white rounded-[18px] overflow-hidden border border-gray-100 hover:border-gray-200 active:scale-[0.98] transition-all select-none"
    >
      <div className="relative min-h-[168px] w-full overflow-hidden">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: bg }} aria-hidden />
        )}

        <div className="relative z-10 flex min-h-[168px] flex-col p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-bold leading-snug tracking-tight text-gray-900">
              {category.name}
            </p>
            {productCount > 0 && (
              <span className="flex-shrink-0 rounded-full bg-gray-900/10 px-2 py-0.5 text-[10px] font-semibold text-gray-800">
                {productCount} items
              </span>
            )}
          </div>

          {!onImage && (
            <div className="mt-3 flex justify-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm"
                aria-hidden
              >
                <CategoryIcon name={category.name} strokeColor={stroke} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   Skeleton card
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-gray-100 bg-white animate-pulse">
      <div className="relative min-h-[168px] bg-gray-200">
        <div className="absolute left-3.5 top-3.5 h-4 w-[70%] rounded-md bg-gray-300/80" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function CategoriesPage() {
  const router = useRouter();
  const { data: categoryTree = [], isLoading } = useCategoriesTree();
  const [search, setSearch] = useState('');

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
    <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden pb-10 pt-[env(safe-area-inset-top,0px)]">

      {/* Hero heading */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-[20px] font-medium text-gray-900 mb-0.5">Browse categories</h1>
        <p className="text-[13px] text-gray-400">Tap any category to explore products</p>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3 relative">
        <div className="flex items-center gap-2 px-3 h-10 rounded-full border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-emerald-500 transition">
          <svg
            className="h-4 w-4 text-gray-400 flex-shrink-0"
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
              type: 'text',
              'aria-label': 'Search categories',
            }}
          />
        </div>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
          ? (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-gray-700 mb-1">No categories found</p>
              <button
                onClick={() => setSearch('')}
                className="text-[12px] text-emerald-600 font-medium hover:text-emerald-800 transition"
              >
                Clear search
              </button>
            </div>
          )
          : filtered.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))
        }
      </div>

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
                className="text-[12px] font-medium text-emerald-700 hover:text-emerald-800"
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
                const slugOrId = p?.slug || p?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (!slugOrId) return;
                      router.push(`/product?id=${encodeURIComponent(String(slugOrId).trim())}`);
                    }}
                    className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3.5 py-3 text-left hover:border-gray-200 active:scale-[0.99] transition"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                      <Image
                        src={img}
                        alt={p?.name || 'Product'}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-gray-900 truncate">
                        {p?.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                        {p?.category || p?.categoryName || ''}
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
        <div className="px-4 mt-4">
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 bg-white text-[13px] font-medium text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            View all products
            <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
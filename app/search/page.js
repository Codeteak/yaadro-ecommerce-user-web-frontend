'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';
import { useSearchProducts, useProducts } from '../../hooks/useProducts';
import ProductCard from '../../components/ProductCard';
import Container from '../../components/Container';
import ProductCarousel from '../../components/ProductCarousel';
import FloatingViewCartPill from '../../components/FloatingViewCartPill';

const DISCOVER_PER_SECTION = 12;

/** Stable id for deduping carousel rows across API lists. */
function discoverProductKey(p) {
  const id = p?.id ?? p?.productId;
  if (id == null || id === '') return null;
  return String(id);
}

/**
 * Build three mutually exclusive product lists: prefer each section’s own sort list first,
 * then backfill any short section from a merged walk (newest → popular → budget) without reuse.
 */
function partitionDiscoverCarouselProducts(newestList, popularList, budgetList, maxEach = DISCOVER_PER_SECTION) {
  const newest = Array.isArray(newestList) ? newestList : [];
  const popular = Array.isArray(popularList) ? popularList : [];
  const budget = Array.isArray(budgetList) ? budgetList : [];
  const used = new Set();

  const takeFrom = (list) => {
    const out = [];
    for (const p of list) {
      if (out.length >= maxEach) break;
      const k = discoverProductKey(p);
      if (!k || used.has(k)) continue;
      used.add(k);
      out.push(p);
    }
    return out;
  };

  const fresh = takeFrom(newest);
  const picks = takeFrom(popular);
  const deals = takeFrom(budget);

  const merged = [...newest, ...popular, ...budget];
  const fill = (bucket) => {
    for (const p of merged) {
      if (bucket.length >= maxEach) return;
      const k = discoverProductKey(p);
      if (!k || used.has(k)) continue;
      used.add(k);
      bucket.push(p);
    }
  };

  fill(fresh);
  fill(picks);
  fill(deals);

  return { fresh, picks, deals };
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-100" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-4/5" />
        <div className="h-3 bg-gray-100 rounded-full w-3/5" />
      </div>
    </div>
  );
}

function DiscoverSections({ sections }) {
  const available = (sections || []).filter((s) => (s.products || []).length > 0);
  if (!available.length) return null;

  return (
    <div className="mt-8 space-y-8">
      {available.map((section) => (
        <section key={section.key} aria-label={section.title}>
          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
              {section.title}
            </h2>
            <p className="mt-2 text-[13px] md:text-sm text-gray-500">{section.description}</p>
          </div>
          <ProductCarousel products={section.products} showMoreLink="/products" />
        </section>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = (searchParams?.get('q') || '').toString();
  const [value, setValue] = useState(initialQ);
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    setValue(initialQ);
    setQ(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  // Debounce typing -> query
  useEffect(() => {
    const t = window.setTimeout(() => setQ(value.trim()), 220);
    return () => window.clearTimeout(t);
  }, [value]);

  // Keep URL in sync (but don’t spam history)
  useEffect(() => {
    const next = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
    router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const { data, isLoading } = useSearchProducts({
    q,
    page: 1,
    per_page: 24,
  });

  const products = useMemo(() => data?.products || [], [data]);

  // Fallback sections to avoid an "empty page" feel on search.
  const { data: newestData } = useProducts({
    limit: 48,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const { data: popularData } = useProducts({
    limit: 48,
    sort_by: 'sold_count',
    sort_order: 'desc',
  });
  const { data: budgetData } = useProducts({
    limit: 48,
    sort_by: 'price',
    sort_order: 'asc',
  });

  const discoverSections = useMemo(() => {
    const { fresh, picks, deals } = partitionDiscoverCarouselProducts(
      newestData?.products,
      popularData?.products,
      budgetData?.products,
      DISCOVER_PER_SECTION
    );
    return [
      {
        key: 'search-fallback-new',
        title: 'Fresh arrivals',
        description: 'Recently added products across the store.',
        products: fresh,
      },
      {
        key: 'search-fallback-popular',
        title: 'Popular picks',
        description: 'Customer favorites people reorder often.',
        products: picks,
      },
      {
        key: 'search-fallback-budget',
        title: 'Value deals',
        description: 'Budget-friendly picks for your basket.',
        products: deals,
      },
    ];
  }, [newestData?.products, popularData?.products, budgetData?.products]);

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden pb-28">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
        <Container>
          <div className="flex items-center gap-3 px-4 py-3 md:px-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>

            <div className="flex-1 flex items-center gap-2 px-3 h-11 rounded-full border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-emerald-500 transition">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-400"
                autoFocus
                inputMode="search"
                aria-label="Search products"
              />
              {value.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setValue('')}
                  className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 px-2"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="px-4 pt-4 pb-6 md:px-0">
          {q.trim().length < 2 ? (
            <>
              <div className="py-10 text-center text-gray-500">
                Type at least <span className="font-semibold">2 letters</span> to search.
              </div>
              <DiscoverSections sections={discoverSections} />
            </>
          ) : isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <>
              <div className="py-12 text-center">
                <p className="text-[14px] font-semibold text-gray-800">No products found</p>
                <p className="text-[12px] text-gray-500 mt-1">Try searching with different keywords.</p>
                <Link
                  href="/categories"
                  className="inline-flex mt-6 text-[12px] font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Browse categories
                </Link>
              </div>
              <DiscoverSections sections={discoverSections} />
            </>
          ) : (
            <>
              <p className="text-[11px] text-gray-400 mb-3">
                Showing {products.length} result{products.length !== 1 ? 's' : ''} for “{q}”
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </Container>

      <FloatingViewCartPill />
    </div>
  );
}


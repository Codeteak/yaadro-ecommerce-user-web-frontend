'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';
import { useInfiniteSearchProducts, useProducts } from '../../hooks/useProducts';
import ProductCard from '../../components/ProductCard';
import Container from '../../components/Container';
import ProductCarousel from '../../components/ProductCarousel';
import FloatingViewCartPill from '../../components/FloatingViewCartPill';
import BannerCarousel from '../../components/BannerCarousel';
import InfiniteScrollSentinel from '../../components/InfiniteScrollSentinel';
import { useShopBranding } from '../../context/ShopBrandingContext';
import { SearchResultsGridSkeleton } from '../../components/skeletons/SearchPageSkeleton';
import { dedupeProductsByVariantGroup } from '../../utils/productUtils';

const DISCOVER_PER_SECTION = 12;
const SEARCH_BASE_PATH = '/search/';

function readQFromLocation() {
  if (typeof window === 'undefined') return '';
  return (new URLSearchParams(window.location.search).get('q') || '').trim();
}

function buildSearchHref(q) {
  if (!q) return SEARCH_BASE_PATH;
  return `${SEARCH_BASE_PATH}?q=${encodeURIComponent(q)}`;
}

function locationMatchesQ(q) {
  if (typeof window === 'undefined') return true;
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname !== '/search') return false;
  return readQFromLocation() === q;
}

/** Stable id for deduping carousel rows across API lists. */
function discoverProductKey(p) {
  const id = p?.id ?? p?.productId;
  if (id == null || id === '') return null;
  return String(id);
}

/**
 * Split one newest catalog list into three discover carousels (no extra API sorts).
 */
function partitionDiscoverFromCatalog(catalogList, maxEach = DISCOVER_PER_SECTION) {
  const catalog = dedupeProductsByVariantGroup(Array.isArray(catalogList) ? catalogList : []);
  const used = new Set();

  const takeSlice = (start, preferDiscount) => {
    const out = [];
    for (let i = start; i < catalog.length && out.length < maxEach; i += 1) {
      const p = catalog[i];
      const k = discoverProductKey(p);
      if (!k || used.has(k)) continue;
      if (preferDiscount) {
        const hasDeal =
          (p.discountPercentage > 0) ||
          (p.originalPrice && parseFloat(p.originalPrice) > parseFloat(p.price));
        if (!hasDeal && out.length < maxEach / 2) {
          // soft prefer deals but still fill
        }
      }
      used.add(k);
      out.push(p);
    }
    // backfill
    for (const p of catalog) {
      if (out.length >= maxEach) break;
      const k = discoverProductKey(p);
      if (!k || used.has(k)) continue;
      used.add(k);
      out.push(p);
    }
    return out;
  };

  const fresh = takeSlice(0, false);
  const picks = takeSlice(Math.min(8, catalog.length), false);
  const byPrice = [...catalog].sort(
    (a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0)
  );
  const deals = [];
  for (const p of byPrice) {
    if (deals.length >= maxEach) break;
    const k = discoverProductKey(p);
    if (!k || used.has(k)) continue;
    used.add(k);
    deals.push(p);
  }
  for (const p of catalog) {
    if (deals.length >= maxEach) break;
    const k = discoverProductKey(p);
    if (!k || used.has(k)) continue;
    used.add(k);
    deals.push(p);
  }

  return { fresh, picks, deals };
}


function DiscoverSections({ sections, freshBanner }) {
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
          {section.key === 'search-fallback-new' && freshBanner}
          <ProductCarousel products={section.products} showMoreLink="/products" />
        </section>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef(null);
  const didInitialFocusRef = useRef(false);

  const initialQ = (searchParams?.get('q') || '').trim();
  const [value, setValue] = useState(initialQ);
  const [q, setQ] = useState(initialQ);

  // Debounce typing -> API query (skip no-op updates).
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = value.trim();
      setQ((prev) => (prev === next ? prev : next));
    }, 220);
    return () => window.clearTimeout(t);
  }, [value]);

  // Mirror query in the address bar without Next.js router navigation (prevents /search replace loops).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (locationMatchesQ(q)) return;
    window.history.replaceState(null, '', buildSearchHref(q));
  }, [q]);

  // Back/forward: restore input from URL.
  useEffect(() => {
    const onPopState = () => {
      const fromUrl = readQFromLocation();
      setValue(fromUrl);
      setQ(fromUrl);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Focus search field once when opening the page.
  useEffect(() => {
    if (didInitialFocusRef.current) return;
    didInitialFocusRef.current = true;
    const id = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const showDiscover = q.length < 2;

  const { bannerEnabled, bannerImages } = useShopBranding();
  const isLocalDev = process.env.NODE_ENV !== 'production';

  const shopBanners = useMemo(() => {
    // In local/dev we use static banners so you always see something.
    if (isLocalDev) {
      return [
        { id: 'local-1', image: '/banner/360_F_249501541_XmWdfAfUbWAvGxBwAM0ba2aYT36ntlpH.jpg' },
        {
          id: 'local-2',
          image:
            '/banner/11871820-online-shopping-am-telefon-kaufen-verkaufen-geschaft-digitale-web-banner-anwendung-geldwerbung-zahlung-e-commerce-illustration-suche-vektor.jpg',
        },
        { id: 'local-3', image: '/banner/360_F_465465254_1pN9MGrA831idD6zIBL7q8rnZZpUCQTy.jpg' },
      ];
    }

    if (!Array.isArray(bannerImages) || bannerImages.length === 0) return [];
    if (bannerEnabled === false) return [];
    return bannerImages.map((url, index) => ({
      id: `shop-banner-${index}`,
      image: url,
    }));
  }, [bannerEnabled, bannerImages, isLocalDev]);

  const freshBanner = useMemo(() => {
    if (!shopBanners.length) return null;
    return (
      <div className="mb-4">
        <div className="overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-gray-200/80">
          <BannerCarousel
            banners={shopBanners}
            fallbackToDefaults={false}
            imageClassName="object-cover object-center"
            className="bg-white"
          />
        </div>
      </div>
    );
  }, [shopBanners]);

  const {
    data: searchInfinite,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteSearchProducts({ q, per_page: 24 });

  const products = useMemo(
    () => (searchInfinite?.pages || []).flatMap((p) => p?.products || []),
    [searchInfinite?.pages]
  );

  const { data: discoverCatalog } = useProducts({
    limit: 48,
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: showDiscover,
  });

  const discoverSections = useMemo(() => {
    if (!showDiscover) return [];
    const { fresh, picks, deals } = partitionDiscoverFromCatalog(
      discoverCatalog?.products,
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
  }, [showDiscover, discoverCatalog?.products]);

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
                ref={searchInputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-400"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
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
          {q.length < 2 ? (
            <>
              <div className="py-10 text-center text-gray-500">
                Type at least <span className="font-semibold">2 letters</span> to search.
              </div>
              <DiscoverSections sections={discoverSections} freshBanner={freshBanner} />
            </>
          ) : isLoading ? (
            <SearchResultsGridSkeleton />
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
              <DiscoverSections sections={discoverSections} freshBanner={freshBanner} />
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
              <InfiniteScrollSentinel
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                showEndLabel={products.length > 0 && !hasNextPage}
              />
            </>
          )}
        </div>
      </Container>

      <FloatingViewCartPill />
    </div>
  );
}

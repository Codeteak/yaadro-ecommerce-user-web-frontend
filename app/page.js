'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys, useRootCategories, useProducts } from '../hooks/useProducts';
import { homeSectionKeys } from '../hooks/useHomeSections';
import { useLoginNavigation } from '../hooks/useLoginNavigation';
import { useAlert } from '../context/AlertContext';
import { useLocationService } from '../context/LocationServiceContext';
import { useAuth } from '../context/AuthContext';
import { useShopBranding } from '../context/ShopBrandingContext';
import ProductCard from '../components/ProductCard';
import Container from '../components/Container';
import FloatingViewCartPill from '../components/FloatingViewCartPill';
import BannerCarousel from '../components/BannerCarousel';
import HomeSections from '../components/home/HomeSections';
import { dedupeProductsByVariantGroup } from '../utils/productUtils';
import HomePageSkeleton from '../components/skeletons/HomePageSkeleton';
import { ProductCarouselRowSkeleton } from '../components/skeletons/primitives';
import SearchSuggestInput from '../components/search/SearchSuggestInput';
import {
  ArrowRightRegular as ArrowRight,
  ClassifyRegular as Classify,
  MapPinRegular as MapPin,
  SearchFilled,
  User1Filled as User,
} from '../components/icons';

const PREVIEW_FIRST_CARD = process.env.NODE_ENV === 'development';

function withHomeCardPreview(product, index) {
  if (!PREVIEW_FIRST_CARD || index !== 0) return product;
  const listPrice = 155;
  const offerPrice = 105;
  return {
    ...product,
    name: 'Fresh Organic Tomatoes',
    price: listPrice,
    offerPrice,
    weight: 500,
    unit: 'g',
    unit_size: '500',
    bundle_rules: [{ buy_qty: 2, get_qty: 1, reward_type: 'free' }],
  };
}

/** Full-width Browse Categories CTA — hero (on purple) or sticky (after scroll). */
function BrowseCategoriesCta({ variant = 'hero' }) {
  if (variant === 'sticky') {
    return (
      <Link
        href="/categories"
        className="mx-3 mt-1 flex items-center justify-between gap-3 rounded-full px-4 py-2.5 text-gray-900 shadow-[0_12px_32px_rgba(109,40,217,0.28)] ring-2 ring-violet-300/80 backdrop-blur-md transition hover:brightness-105 active:scale-[0.98]"
        style={{ background: 'rgba(167, 139, 250, 0.78)' }}
        aria-label="Browse categories"
      >
        <span className="inline-flex items-center gap-2.5 min-w-0">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-violet-400/40"
            style={{ background: 'rgba(196, 181, 253, 0.9)' }}
          >
            <Classify size={20} color="#111827" className="h-5 w-5" aria-hidden />
          </span>
          <span className="truncate text-[14px] font-extrabold tracking-wide text-gray-900">
            Browse Categories
          </span>
        </span>
        <ArrowRight size={18} color="#111827" className="h-[18px] w-[18px] shrink-0" aria-hidden />
      </Link>
    );
  }

  return (
    <div className="relative z-20 mt-5 px-3 sm:px-6 md:px-8 pb-2">
      <Link
        href="/categories"
        className="group flex w-full items-center justify-between gap-3 rounded-full bg-violet-200/50 px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_12px_40px_rgba(109,40,217,0.22)] ring-1 ring-violet-300/70 backdrop-blur-md transition hover:bg-violet-200/65 active:scale-[0.98]"
        aria-label="Browse categories"
      >
        <span className="inline-flex items-center gap-3 min-w-0">
          <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100/90 ring-1 ring-violet-300/60">
            <Classify size={24} color="#111827" className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] sm:text-base font-extrabold tracking-wide text-gray-900">
              Browse Categories
            </span>
            <span className="mt-0.5 block truncate text-[12px] font-medium text-gray-700">
              See everything we stock
            </span>
          </span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-[0_8px_20px_rgba(15,23,42,0.12)] ring-1 ring-violet-100 transition group-hover:bg-violet-50">
          <ArrowRight size={18} color="#111827" className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </Link>
    </div>
  );
}

// Fresh Zone taxonomy derived from common supermarket "fresh" departments.
const FRESH_CATEGORY_KEYWORDS = [
  'fresh',
  'fruit',
  'fruits',
  'vegetable',
  'vegetables',
  'dairy',
  'milk',
  'egg',
  'eggs',
  'meat',
  'seafood',
  'fish',
  'chicken',
  'mutton',
  'poultry',
  'bakery',
  'bread',
  'paneer',
  'curd',
  'buttermilk',
];

const FRESH_PRODUCT_KEYWORDS = [
  'fresh',
  'organic',
  'farm',
  'juice',
  'fruit',
  'vegetable',
  'milk',
  'egg',
  'bread',
  'paneer',
  'curd',
  'fish',
  'chicken',
  'meat',
  'seafood',
  'leafy',
  'herb',
];

const NON_FRESH_KEYWORDS = [
  'frozen',
  'snack',
  'pantry',
  'cleaning',
  'personal care',
  'baby care',
  'health',
  'wellness',
  'spice',
  'condiment',
  'home',
  'kitchen',
];

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [homeSearch, setHomeSearch] = useState('');
  
  const { showAlert } = useAlert();
  const { isAuthenticated } = useAuth();
  const { goToLogin } = useLoginNavigation();
  const {
    isChecking: isLocationChecking,
    serviceable: isServiceable,
    recheckLocation,
    openServiceAreaSheet,
  } = useLocationService();
  const { shopName, shopImage, bannerEnabled, bannerImages } = useShopBranding();

  const isLocalDev = process.env.NODE_ENV !== 'production';

  const shopBanners = useMemo(() => {
    // In local/dev we show static banners (from `/public/banner/*`) regardless of resolver response.
    if (isLocalDev) {
      return [
        {
          id: 'local-1',
          image:
            '/banner/360_F_249501541_XmWdfAfUbWAvGxBwAM0ba2aYT36ntlpH.jpg',
        },
        {
          id: 'local-2',
          image:
            '/banner/11871820-online-shopping-am-telefon-kaufen-verkaufen-geschaft-digitale-web-banner-anwendung-geldwerbung-zahlung-e-commerce-illustration-suche-vektor.jpg',
        },
        {
          id: 'local-3',
          image:
            '/banner/360_F_465465254_1pN9MGrA831idD6zIBL7q8rnZZpUCQTy.jpg',
        },
      ];
    }

    // Production: use all banner URLs from resolve-by-domain.
    if (!Array.isArray(bannerImages) || bannerImages.length === 0) return [];
    if (bannerEnabled === false) return [];
    return bannerImages.map((url, index) => ({
      id: `shop-banner-${index}`,
      image: url,
    }));
  }, [bannerEnabled, bannerImages, isLocalDev]);

  // Pull-to-refresh (mobile-like)
  const [ptrPull, setPtrPull] = useState(0); // px
  const [ptrRefreshing, setPtrRefreshing] = useState(false);
  const ptrRef = useRef({ startY: 0, pulling: false });

  const ptrThreshold = 72;
  const ptrMax = 110;

  const beginRefresh = async () => {
    if (ptrRefreshing) return;
    setPtrRefreshing(true);
    setPtrPull(ptrThreshold);
    try {
      recheckLocation?.();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productKeys.categoryRoots() }),
        queryClient.invalidateQueries({ queryKey: homeSectionKeys.all }),
      ]);
    } finally {
      // Small delay to make animation visible/stable
      window.setTimeout(() => {
        setPtrRefreshing(false);
        setPtrPull(0);
      }, 450);
    }
  };

  const heroSectionRef = useRef(null);
  const [stickyCategoryNavVisible, setStickyCategoryNavVisible] = useState(false);

  // Load root categories + catalog (Fresh Zone). Merch shelves come from home-sections.
  const { data: categoriesData, isLoading: categoriesLoading } = useRootCategories();
  const { data: catalogData, isLoading: catalogLoading } = useProducts({
    limit: 24,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Process data — root categories still feed Fresh Zone tabs; Browse CTA links to /categories.
  const allCategories = categoriesData?.filter((cat) => cat.isActive !== false) || [];

  const catalogProducts = useMemo(
    () => dedupeProductsByVariantGroup(catalogData?.products || []),
    [catalogData?.products]
  );

  // Fresh Zone category tabs
  const [freshZoneCategoryId, setFreshZoneCategoryId] = useState(null);

  const getCategoryImageSrc = (cat) =>
    cat?.image?.url ||
    cat?.imageUrl ||
    cat?.image_url ||
    cat?.photo?.url ||
    cat?.photoUrl ||
    cat?.photo_url ||
    cat?.icon?.url ||
    cat?.iconUrl ||
    cat?.icon_url ||
    null;

  const productMatchesCategory = (product, cat) => {
    if (!product || !cat) return true;
    const catId = cat?.id ?? cat?._id ?? null;
    const catName = (cat?.name || '').toString().trim().toLowerCase();

    const pidCatId =
      product?.categoryId ??
      product?.category_id ??
      product?.category?.id ??
      product?.category?._id ??
      null;
    if (catId != null && pidCatId != null && String(pidCatId) === String(catId)) return true;

    const pName =
      (product?.category?.name ?? product?.category ?? product?.categoryName ?? product?.category_name ?? '')
        .toString()
        .trim()
        .toLowerCase();
    if (catName && pName && pName === catName) return true;

    const pCats = Array.isArray(product?.categories) ? product.categories : null;
    if (catName && pCats?.some((c) => (c?.name ?? c)?.toString?.().trim?.().toLowerCase?.() === catName))
      return true;

    return false;
  };

  const normalizeText = (value) =>
    (value ?? '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const hasAnyKeyword = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

  const getProductFreshText = (product) =>
    normalizeText(
      [
        product?.name,
        product?.title,
        product?.description,
        product?.category?.name,
        product?.categoryName,
        product?.category_name,
        product?.category,
      ]
        .filter(Boolean)
        .join(' ')
    );

  const allFreshZoneProducts = catalogProducts;
  const freshZoneLoading = catalogLoading;

  const freshZoneCategories = useMemo(() => {
    if (!allCategories.length || !allFreshZoneProducts.length) return [];

    const scored = allCategories
      .map((cat) => {
        const catText = normalizeText([cat?.name, cat?.slug].filter(Boolean).join(' '));
        const categoryProducts = allFreshZoneProducts.filter((p) => productMatchesCategory(p, cat));
        if (!categoryProducts.length) {
          return { category: cat, score: Number.NEGATIVE_INFINITY };
        }

        const categoryMatchScore = hasAnyKeyword(catText, FRESH_CATEGORY_KEYWORDS) ? 6 : 0;
        const categoryPenalty = hasAnyKeyword(catText, NON_FRESH_KEYWORDS) ? -5 : 0;

        let productFreshHits = 0;
        let productPenaltyHits = 0;
        categoryProducts.forEach((p) => {
          const pText = getProductFreshText(p);
          if (hasAnyKeyword(pText, FRESH_PRODUCT_KEYWORDS)) productFreshHits += 1;
          if (hasAnyKeyword(pText, NON_FRESH_KEYWORDS)) productPenaltyHits += 1;
        });

        const productSignalScore = productFreshHits * 2 - productPenaltyHits;
        const score = categoryMatchScore + productSignalScore + categoryPenalty;

        return { category: cat, score };
      })
      .filter((item) => item.score >= 3)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.category);

    return scored;
  }, [allCategories, allFreshZoneProducts]);

  const freshZoneBaseProducts = useMemo(() => {
    if (!allFreshZoneProducts.length) return [];
    const freshCategoryProducts = allFreshZoneProducts.filter((p) =>
      freshZoneCategories.some((c) => productMatchesCategory(p, c))
    );
    return dedupeProductsByVariantGroup(freshCategoryProducts);
  }, [allFreshZoneProducts, freshZoneCategories]);

  const freshZoneProductPool = useMemo(() => {
    const merged = allFreshZoneProducts.length ? allFreshZoneProducts : catalogProducts;
    return dedupeProductsByVariantGroup(merged);
  }, [allFreshZoneProducts, catalogProducts]);

  const isFreshKeywordProduct = useCallback((product) => {
    const pText = getProductFreshText(product);
    if (hasAnyKeyword(pText, NON_FRESH_KEYWORDS)) return false;
    return hasAnyKeyword(pText, FRESH_PRODUCT_KEYWORDS);
  }, []);

  const freshZoneDisplayProductsBase = useMemo(() => {
    if (freshZoneBaseProducts.length) return freshZoneBaseProducts;

    const keywordProducts = freshZoneProductPool.filter(isFreshKeywordProduct);
    if (keywordProducts.length) return dedupeProductsByVariantGroup(keywordProducts);

    return catalogProducts.slice(0, 12);
  }, [freshZoneBaseProducts, freshZoneProductPool, catalogProducts, isFreshKeywordProduct]);

  const freshZoneDisplayCategories = useMemo(() => {
    if (freshZoneCategories.length) return freshZoneCategories;
    if (!allCategories.length || !freshZoneDisplayProductsBase.length) return [];

    return allCategories
      .filter((cat) => freshZoneDisplayProductsBase.some((p) => productMatchesCategory(p, cat)))
      .slice(0, 8);
  }, [freshZoneCategories, allCategories, freshZoneDisplayProductsBase]);

  const freshZoneSelectedCategory =
    freshZoneCategoryId == null
      ? null
      : freshZoneDisplayCategories.find((c) => String(c.id) === String(freshZoneCategoryId)) || null;

  useEffect(() => {
    if (freshZoneCategoryId == null) return;
    const stillExists = freshZoneDisplayCategories.some(
      (c) => String(c.id) === String(freshZoneCategoryId)
    );
    if (!stillExists) setFreshZoneCategoryId(null);
  }, [freshZoneCategoryId, freshZoneDisplayCategories]);

  const freshZoneDisplayProducts = freshZoneSelectedCategory
    ? freshZoneDisplayProductsBase.filter((p) => productMatchesCategory(p, freshZoneSelectedCategory))
    : freshZoneDisplayProductsBase;

  const loading = categoriesLoading || catalogLoading;

  useEffect(() => {
    if (loading) return undefined;
    const hero = heroSectionRef.current;
    if (!hero) {
      setStickyCategoryNavVisible(false);
      return undefined;
    }

    const update = () => {
      const rect = hero.getBoundingClientRect();
      setStickyCategoryNavVisible(rect.bottom <= 2);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [loading]);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    showAlert('Thank you for subscribing!', 'Success', 'success');
    setEmail('');
  };

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div
      className="w-full max-w-full"
      style={{ maxWidth: '100vw' }}
      onTouchStart={(e) => {
        if (typeof window === 'undefined') return;
        if (window.scrollY > 0) return;
        const y = e.touches?.[0]?.clientY;
        if (!Number.isFinite(y)) return;
        ptrRef.current.startY = y;
        ptrRef.current.pulling = true;
      }}
      onTouchMove={(e) => {
        if (!ptrRef.current.pulling) return;
        if (typeof window === 'undefined') return;
        if (window.scrollY > 0) return;
        const y = e.touches?.[0]?.clientY;
        if (!Number.isFinite(y)) return;
        const raw = y - ptrRef.current.startY;
        if (raw <= 0) {
          setPtrPull(0);
          return;
        }
        // Resist as it grows (feel like native)
        const eased = Math.min(ptrMax, raw * 0.55);
        setPtrPull(eased);
      }}
      onTouchEnd={() => {
        if (!ptrRef.current.pulling) return;
        ptrRef.current.pulling = false;
        if (ptrPull >= ptrThreshold) {
          void beginRefresh();
          return;
        }
        setPtrPull(0);
      }}
      onTouchCancel={() => {
        ptrRef.current.pulling = false;
        setPtrPull(0);
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[80] flex justify-center"
        style={{
          transform: `translateY(${Math.max(0, ptrPull) - 56}px)`,
          transition: ptrRef.current.pulling ? 'none' : 'transform 220ms ease-out',
        }}
        aria-hidden
      >
        <div className="mt-2 rounded-full bg-white/90 px-3 py-2 shadow-md border border-gray-100 flex items-center gap-2">
          <span
            className={`h-4 w-4 rounded-full border-2 border-violet-600 border-t-transparent ${
              ptrRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span className="text-[12px] font-semibold text-gray-700">
            {ptrRefreshing ? 'Refreshing…' : ptrPull >= ptrThreshold ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Sticky Browse Categories — button only (no full-width card chrome) */}
      {!loading && (
        <div
          className={`fixed inset-x-0 top-0 z-[65] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
            stickyCategoryNavVisible
              ? 'translate-y-0 opacity-100 pointer-events-none'
              : 'pointer-events-none -translate-y-[calc(100%+8px)] opacity-0'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          aria-hidden={!stickyCategoryNavVisible}
        >
          <div className={`px-0 ${stickyCategoryNavVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <BrowseCategoriesCta variant="sticky" />
          </div>
        </div>
      )}

      {/* Hero section (purple grocery) */}
      <section
        ref={heroSectionRef}
        className="home-hero-minh w-full relative overflow-hidden"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(160deg, #7d24d6 0%, #902bf5 42%, #6d28d9 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 calc(100% - 7rem), rgba(0,0,0,0.4) calc(100% - 3.5rem), transparent 100%)',
            maskImage: 'linear-gradient(to bottom, #000 0%, #000 calc(100% - 7rem), rgba(0,0,0,0.4) calc(100% - 3.5rem), transparent 100%)',
          }}
          aria-hidden
        >
          <div className="absolute inset-y-0 right-[-4%] w-[70%] sm:w-[58%] md:w-[50%]">
            <Image
              src="/banner/trolly.png"
              alt=""
              fill
              className="object-contain object-right-bottom origin-bottom-right scale-[1.15]"
              sizes="(max-width: 768px) 75vw, 50vw"
              priority
              unoptimized
              style={{ mixBlendMode: 'lighten' }}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(125,36,214,0.97) 0%, rgba(144,43,245,0.82) 42%, rgba(109,40,217,0.28) 72%, rgba(109,40,217,0.08) 100%)',
            }}
          />
        </div>
        <Container className="px-0 sm:px-0 lg:px-0 xl:px-0 2xl:px-0">
            <div className="relative text-white flex flex-col overflow-hidden pb-14 sm:pb-16">
            {/* Header: shop branding + search + profile in one row */}
            <div className="relative z-30 flex items-center gap-2 px-3 sm:px-4 min-h-[52px] pt-5 sm:pt-6 md:pt-8">
              <div className="flex min-w-0 max-w-[38%] sm:max-w-[42%] shrink-0 items-center gap-2">
                {shopImage ? (
                  <img
                    src={shopImage}
                    alt={shopName || ''}
                    className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl object-contain ring-1 ring-white/30 bg-white/15"
                    width={44}
                    height={44}
                  />
                ) : (
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                    <Image
                      src="/trolley.png"
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[14px] sm:text-[16px] font-extrabold text-white leading-tight">
                    {shopName || 'Yaadro'}
                  </span>
                  {isLocationChecking ? (
                    <button
                      type="button"
                      onClick={() => openServiceAreaSheet()}
                      className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-white/90 hover:bg-white/30 transition-colors"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/80 animate-pulse" />
                      <span className="truncate">Checking…</span>
                    </button>
                  ) : isServiceable === true ? (
                    <button
                      type="button"
                      onClick={() => openServiceAreaSheet()}
                      className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-violet-800 hover:bg-white transition-colors"
                    >
                      <MapPin size={12} className="h-3 w-3 shrink-0" />
                      <span className="truncate">Available</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openServiceAreaSheet()}
                      className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-white hover:bg-red-600 transition-colors"
                    >
                      <MapPin size={12} className="h-3 w-3 shrink-0" />
                      <span className="truncate">Not available</span>
                    </button>
                  )}
                </div>
              </div>

              <SearchSuggestInput
                value={homeSearch}
                onValueChange={setHomeSearch}
                onSubmitQuery={(next) => {
                  const q = String(next || '').trim();
                  router.push(q ? `/search/?q=${encodeURIComponent(q)}` : '/search/');
                }}
                placeholder="Search products"
                className="min-w-0 flex-1 max-w-none"
                shellClassName="flex items-center gap-2 px-3 h-11 rounded-full border border-gray-200 bg-white focus-within:border-white transition shadow-sm"
                iconColor="#111827"
                IconComponent={SearchFilled}
                inputClassName="w-full bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-500"
              />

              <button
                type="button"
                onClick={() => {
                  if (isAuthenticated) {
                    window.location.href = '/profile';
                  } else {
                    goToLogin();
                  }
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm"
                aria-label={isAuthenticated ? 'Profile' : 'Login'}
              >
                <User size={22} color="#111827" className="w-[22px] h-[22px]" />
              </button>
            </div>

            {/* Tagline */}
            <div className="relative z-[9] mt-4 sm:mt-5 pl-4 sm:pl-5 max-w-[min(92vw,540px)]">
              <p className="text-left text-home-hero-headline font-extrabold text-white drop-shadow-[0_8px_24px_rgba(76,29,149,0.35)]">
                Groceries in Minutes ... 
              </p>
            </div>

            {/* CTA below tagline */}
            <div className="relative z-20 mt-5 pl-4 sm:pl-5">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[13px] font-extrabold tracking-wide text-[#902bf5] shadow-[0_12px_30px_rgba(15,23,42,0.22)] hover:bg-violet-50 active:scale-[0.98] transition"
              >
                Shop Now
              </Link>
            </div>

            {/* Banner carousel right below "Shop Now" */}
            {shopBanners.length > 0 && (
              <div className="relative z-20 mt-6 px-3 sm:px-6 md:px-8 pb-2">
                <div className="overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.18)] ring-1 ring-white/25">
                  <BannerCarousel
                    banners={shopBanners}
                    fallbackToDefaults={false}
                    imageClassName="object-cover object-center"
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {/* Single Browse Categories CTA (replaces category icon boxes) */}
            <BrowseCategoriesCta variant="hero" />
          </div>
        </Container>
      </section>

      <div className="relative z-10 [&>section:first-child]:!pt-1 [&>section:first-child]:sm:!pt-2 -mt-8 sm:-mt-10">
        <HomeSections />
      </div>

      {/* Fresh Zone */}
      <section
        className="fresh-zone-minh relative overflow-hidden bg-white rounded-[32px] mx-3 sm:mx-6 md:mx-8 my-4 sm:my-6 min-h-[12rem]"
      >
        {freshZoneLoading && freshZoneDisplayProducts.length === 0 && (
          <Container className="relative z-[2] py-10 sm:py-14">
            <div className="mb-6 px-3 sm:px-4 md:px-0 text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 font-headingnow">FRESH ZONE</h2>
              <p className="text-gray-500 mt-1">Loading daily essentials…</p>
            </div>
            <ProductCarouselRowSkeleton count={6} />
          </Container>
        )}

        {freshZoneDisplayProducts.length > 0 && (
          <>
          {/* Background video */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <video
              className="h-full w-full object-contain object-center"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source
                src="/From KlickPin CF 26 Fresh romantic date night ideas that are worth saving if you love elegant details and creative inspiration for women who love classy Pinterest - Pin-1123929650777965800.mp4"
                type="video/mp4"
              />
            </video>
          </div>

          <Container className="relative z-[2] py-10 sm:py-14 md:py-20 lg:py-24 [@media(max-height:720px)]:py-8">
            <div className="flex flex-col items-center text-center gap-2 mb-6 sm:mb-8 px-3 sm:px-4 md:px-0">
              <div className="w-full">
                <h2 className="text-fresh-zone-heading font-extrabold text-white font-headingnow md:text-6xl">
                  FRESH ZONE
                </h2>
                <p className="text-gray-200 mt-1">Handpicked daily essentials</p>
              </div>
            </div>
            {/* Category tabs (carousel) */}
            {freshZoneDisplayCategories.length > 0 && (
              <div className="w-screen relative left-1/2 -translate-x-1/2 mb-10">
                <div className="overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
                  <div className="flex w-max gap-2 px-4 mx-auto">
                    <button
                      type="button"
                      onClick={() => setFreshZoneCategoryId(null)}
                      className={`snap-start flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                        freshZoneCategoryId == null
                          ? 'border-violet-600 bg-violet-50 text-violet-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>All</span>
                    </button>

                    {freshZoneDisplayCategories.map((cat) => {
                      const active = freshZoneCategoryId != null && String(freshZoneCategoryId) === String(cat.id);
                      const src = getCategoryImageSrc(cat);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFreshZoneCategoryId(cat.id)}
                          className={`snap-start flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                            active
                              ? 'border-violet-600 bg-violet-50 text-violet-800'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="relative h-7 w-7 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                            <img
                              src={src || '/icons/dummy-category-card-icon.png'}
                              alt=""
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '/icons/dummy-category-card-icon.png';
                              }}
                            />
                          </span>
                          <span className="max-w-[9.5rem] truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Products (carousel) */}
            <div className="w-screen relative left-1/2 -translate-x-1/2">
              <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory">
                <div className="flex w-max gap-3 px-4 mx-auto">
                  {freshZoneDisplayProducts.slice(0, 12).map((product, index) => (
                    <div key={product.id} className="snap-start flex-shrink-0">
                      <ProductCard product={withHomeCardPreview(product, index)} isCarousel />
                    </div>
                  ))}
                </div>
              </div>
              {freshZoneSelectedCategory && freshZoneDisplayProducts.length === 0 && (
                <div className="px-4 pb-2 text-sm text-gray-500">
                  No products found for <span className="font-semibold text-gray-800">{freshZoneSelectedCategory.name}</span>.
                </div>
              )}
            </div>

            {/* Bottom center "See all →" (no background) */}
            <div className="mt-10 flex justify-center px-4 md:px-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/90 hover:text-white transition"
              >
                <span>See all</span>
                <ArrowRight size={16} className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Container>
          </>
        )}

        {!freshZoneLoading && catalogProducts.length === 0 && freshZoneDisplayProducts.length === 0 && (
          <Container className="relative z-[2] py-10 sm:py-14 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 font-headingnow">FRESH ZONE</h2>
            <p className="mt-2 text-gray-500">Fresh picks coming soon.</p>
          </Container>
        )}
      </section>

      {/* Footer */}
      <footer className="relative bg-white pt-8 pb-6 sm:pt-10 sm:pb-8 md:pt-16 md:pb-12 border-t border-gray-100 [@media(max-height:720px)]:pt-6 [@media(max-height:720px)]:pb-5">
        <Container>
          <div className="px-3 sm:px-4 md:px-0">
            {/* Brand block */}
            <div className="flex flex-col items-center text-center">
              <h2
                className="font-headingnow text-footer-brand-wordmark font-extrabold text-gray-300/90 select-none"
                aria-label="Yaadro"
              >
                Yaadro
              </h2>
              <p className="mt-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-[0.35em] sm:tracking-[0.4em] text-violet-400">
                SHOP
              </p>
            </div>

            {/* Legal links */}
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-gray-600"
              aria-label="Legal"
            >
              <Link href="/privacy-policy" className="hover:text-violet-700 transition-colors">
                Privacy Policy
              </Link>
              <span aria-hidden className="h-1 w-1 rounded-full bg-gray-300" />
              <Link href="/terms-and-conditions" className="hover:text-violet-700 transition-colors">
                Terms &amp; Conditions
              </Link>
            </nav>

            {/* Divider */}
            <div className="mx-auto mt-8 mb-6 h-px max-w-md bg-gray-100" />

            {/* Maintained by */}
            <a
              href="https://codeteak.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
              aria-label="Maintained by codeteak.com"
            >
              <span>Maintained by</span>
              <Image
                src="/codeteak-logo.png"
                alt="Codeteak"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
              <span className="font-semibold text-gray-700">codeteak.com</span>
            </a>

            {/* Copyright */}
            <p className="mt-3 text-center text-[11px] text-gray-400">
              &copy; {new Date().getFullYear()} Yaadro. All rights reserved.
            </p>
          </div>
        </Container>
      </footer>

      <FloatingViewCartPill />
    </div>
  );
}

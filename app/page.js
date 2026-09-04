'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys, useRootCategories, useProducts } from '../hooks/useProducts';
import { useLoginNavigation } from '../hooks/useLoginNavigation';
import { useAlert } from '../context/AlertContext';
import { useLocationService } from '../context/LocationServiceContext';
import { useAuth } from '../context/AuthContext';
import { useShopBranding } from '../context/ShopBrandingContext';
import ProductCard from '../components/ProductCard';
import ProductGrid from '../components/ProductGrid';
import CategoryCard from '../components/CategoryCard';
import Container from '../components/Container';
import FloatingViewCartPill from '../components/FloatingViewCartPill';
import BannerCarousel from '../components/BannerCarousel';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../utils/categoryImage';
import { dedupeProductsByVariantGroup } from '../utils/productUtils';
import HomePageSkeleton from '../components/skeletons/HomePageSkeleton';
import { ProductCarouselRowSkeleton } from '../components/skeletons/primitives';
import SearchSuggestInput from '../components/search/SearchSuggestInput';

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

/** Compact category tile for the sticky home header (light theme). */
function StickyHomeCategoryChip({ category }) {
  const categoryName = typeof category === 'object' ? category?.name || 'Category' : String(category);
  const catObj = typeof category === 'object' ? category : { name: categoryName };
  const initialSrc = getCategoryImageUrl(catObj);
  const [imgSrc, setImgSrc] = useState(initialSrc || CATEGORY_DUMMY_IMAGE);
  const isDummy = imgSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <Link
      href={`/products?category=${encodeURIComponent(categoryName)}`}
      className="flex w-[68px] flex-shrink-0 flex-col items-center gap-1 active:scale-[0.97] transition-transform"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-gray-200/90">
        <Image
          src={imgSrc}
          alt={isDummy ? '' : categoryName}
          fill
          className={isDummy ? 'object-contain p-1.5' : 'object-cover object-center'}
          sizes="48px"
          onError={() => {
            if (!isDummy) setImgSrc(CATEGORY_DUMMY_IMAGE);
          }}
          unoptimized
        />
      </div>
      <span
        className="max-w-[4.25rem] text-center text-[10px] font-semibold leading-snug text-gray-800 line-clamp-2"
        title={categoryName}
      >
        {categoryName}
      </span>
    </Link>
  );
}
import {
  ArrowRightRegular as ArrowRight,
  MapPinRegular as MapPin,
  User1Regular as User,
} from '../components/icons';

/** Category card for home "Shop by Category" — uniform grid, image fills placeholder (centered). */
function HomeShopCategoryCard({ category }) {
  const categoryName = category?.name || 'Category';
  const initialSrc = getCategoryImageUrl(category) || CATEGORY_DUMMY_IMAGE;
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const isDummy = imgSrc === CATEGORY_DUMMY_IMAGE;

  return (
    <Link
      href={`/products?category=${encodeURIComponent(categoryName)}`}
      className="block overflow-hidden rounded-[18px] border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md active:scale-[0.98]"
      aria-label={categoryName}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
        <Image
          src={imgSrc}
          alt={isDummy ? '' : categoryName}
          fill
          className={
            isDummy
              ? 'object-contain object-center p-4'
              : 'object-cover object-center'
          }
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onError={() => {
            if (!isDummy) setImgSrc(CATEGORY_DUMMY_IMAGE);
          }}
          unoptimized
        />
      </div>
      <div className="border-t border-gray-100 bg-white px-3 py-2.5">
        <p className="truncate text-center text-[13px] font-bold leading-snug text-gray-900">
          {categoryName}
        </p>
      </div>
    </Link>
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
      ]);
    } finally {
      // Small delay to make animation visible/stable
      window.setTimeout(() => {
        setPtrRefreshing(false);
        setPtrPull(0);
      }, 450);
    }
  };

  const categoryScrollRef = useRef(null);
  const heroSectionRef = useRef(null);
  const [stickyCategoryNavVisible, setStickyCategoryNavVisible] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Load root categories + one shared catalog (home sections slice client-side).
  const { data: categoriesData, isLoading: categoriesLoading } = useRootCategories();
  const { data: catalogData, isLoading: catalogLoading } = useProducts({
    limit: 24,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Process data
  // Home categories strip: roots only (already parentId == null from API helper).
  const allCategories = categoriesData?.filter((cat) => cat.isActive !== false) || [];
  const categories = allCategories.slice(0, 12);

  const catalogProducts = useMemo(
    () => dedupeProductsByVariantGroup(catalogData?.products || []),
    [catalogData?.products]
  );

  const featuredProducts = useMemo(() => catalogProducts.slice(0, 8), [catalogProducts]);
  const bestSellers = useMemo(() => catalogProducts.slice(0, 16), [catalogProducts]);
  const newArrivals = useMemo(() => catalogProducts.slice(0, 24), [catalogProducts]);

  // Fresh Zone category tabs
  const [freshZoneCategoryId, setFreshZoneCategoryId] = useState(null);
  // Order Again category tabs (uses newArrivals for now)
  const [orderAgainCategoryId, setOrderAgainCategoryId] = useState(null);

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

  const orderAgainSelectedCategory =
    orderAgainCategoryId == null
      ? null
      : categories.find((c) => String(c.id) === String(orderAgainCategoryId)) || null;

  const orderAgainProducts = orderAgainSelectedCategory
    ? newArrivals.filter((p) => productMatchesCategory(p, orderAgainSelectedCategory))
    : newArrivals;

  const loading = categoriesLoading || catalogLoading;

  useEffect(() => {
    if (loading) return undefined;
    const hero = heroSectionRef.current;
    if (!hero || categories.length === 0) {
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
  }, [loading, categories.length]);

  const handleCategoryMouseDown = (e) => {
    if (!categoryScrollRef.current) return;
    if (e.pointerType === 'touch') return;
    isDraggingRef.current = true;
    categoryScrollRef.current.classList.add('cursor-grabbing');
    startXRef.current = e.pageX - categoryScrollRef.current.offsetLeft;
    scrollLeftRef.current = categoryScrollRef.current.scrollLeft;
  };

  const handleCategoryMouseLeave = () => {
    if (!categoryScrollRef.current) return;
    isDraggingRef.current = false;
    categoryScrollRef.current.classList.remove('cursor-grabbing');
  };

  const handleCategoryMouseUp = () => {
    if (!categoryScrollRef.current) return;
    isDraggingRef.current = false;
    categoryScrollRef.current.classList.remove('cursor-grabbing');
  };

  const handleCategoryMouseMove = (e) => {
    if (!isDraggingRef.current || !categoryScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    categoryScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };
  
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

      {/* Sticky category strip — appears after scrolling past the hero */}
      {!loading && categories.length > 0 && (
        <div
          className={`fixed inset-x-0 top-0 z-[65] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
            stickyCategoryNavVisible
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : 'pointer-events-none -translate-y-[calc(100%+8px)] opacity-0'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          aria-hidden={!stickyCategoryNavVisible}
        >
          <div className="border-b border-gray-100/90 bg-white/95 shadow-[0_8px_28px_rgba(15,23,42,0.07)] backdrop-blur-md">
            <div
              role="region"
              aria-label="Browse categories"
              className="scrollbar-hide overflow-x-auto overflow-y-hidden px-3 pb-2 pt-2.5 touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex w-max items-start gap-3 pb-0.5 pr-1">
                {categories.map((category) => (
                  <StickyHomeCategoryChip key={category.id} category={category} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero section (light theme) */}
      <section
        ref={heroSectionRef}
        className="home-hero-minh w-full relative overflow-hidden"
        style={{
          background: '#ffffff',
          borderBottomLeftRadius: 44,
          borderBottomRightRadius: 44,
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
        }}
      >
        {/* Soft bottom fade (light) */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-52 sm:h-64"
          style={{
            background:
              'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))',
          }}
          aria-hidden
        />
        <Container className="px-0 sm:px-0 lg:px-0 xl:px-0 2xl:px-0">
            <div className="relative text-gray-900 flex flex-col pb-8 sm:pb-10 overflow-hidden">
            {/* Header: shop branding + search + profile in one row */}
            <div className="relative z-30 flex items-center gap-2 px-3 sm:px-4 min-h-[52px] pt-5 sm:pt-6 md:pt-8">
              <div className="flex min-w-0 max-w-[38%] sm:max-w-[42%] shrink-0 items-center gap-2">
                {shopImage ? (
                  <img
                    src={shopImage}
                    alt={shopName || ''}
                    className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl object-contain"
                    width={44}
                    height={44}
                  />
                ) : (
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100">
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
                  <span className="truncate text-[14px] sm:text-[16px] font-extrabold text-gray-900 leading-tight">
                    {shopName || 'Yaadro'}
                  </span>
                  {isLocationChecking ? (
                    <button
                      type="button"
                      onClick={() => openServiceAreaSheet()}
                      className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400 animate-pulse" />
                      <span className="truncate">Checking…</span>
                    </button>
                  ) : isServiceable === true ? (
                    <button
                      type="button"
                      onClick={() => openServiceAreaSheet()}
                      className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-violet-700 hover:bg-violet-200 transition-colors"
                    >
                      <MapPin size={12} className="h-3 w-3 shrink-0" />
                      <span className="truncate">Available</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openServiceAreaSheet()}
                      className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-red-600 hover:bg-red-200 transition-colors"
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white/80 backdrop-blur hover:bg-white transition shadow-sm"
                aria-label={isAuthenticated ? 'Profile' : 'Login'}
              >
                <User size={24} className="w-6 h-6 text-gray-800" />
              </button>
            </div>

            {/* Tagline */}
            <div className="relative z-[9] mt-4 sm:mt-5 pl-4 sm:pl-5 max-w-[min(92vw,540px)]">
              <p className="text-left text-home-hero-headline font-extrabold text-gray-900">
                Groceries in Minutes ... 
              </p>
            </div>

            {/* CTA below tagline */}
            <div className="relative z-20 mt-5 pl-4 sm:pl-5">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-[#902bf5] px-6 py-3 text-[13px] font-extrabold tracking-wide text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] hover:bg-[#7e20e3] active:scale-[0.98] transition"
              >
                Shop Now
              </Link>
            </div>

            {/* Banner carousel right below "Shop Now" */}
            {shopBanners.length > 0 && (
              <div className="relative z-20 mt-6 px-3 sm:px-6 md:px-8 pb-2">
                <div className="overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-gray-200/80">
                  <BannerCarousel
                    banners={shopBanners}
                    fallbackToDefaults={false}
                    imageClassName="object-cover object-center"
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {/* Bottom: categories carousel */}
            {categories.length > 0 && (
              <div className="relative inset-x-0 z-20 mt-11 sm:mt-12 pt-2 pb-2">
                <div
                  ref={categoryScrollRef}
                  role="region"
                  aria-label="Categories"
                  onPointerDown={handleCategoryMouseDown}
                  onPointerLeave={handleCategoryMouseLeave}
                  onPointerUp={handleCategoryMouseUp}
                  onPointerMove={handleCategoryMouseMove}
                  onPointerCancel={handleCategoryMouseUp}
                  className="category-scroll-track flex items-center gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide px-4 cursor-grab select-none touch-pan-x touch-pan-y snap-x snap-mandatory scroll-smooth min-w-0 w-full"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    touchAction: 'pan-x pan-y',
                  }}
                >
                  <div className="flex items-stretch gap-4 flex-nowrap w-max flex-shrink-0 pb-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex-shrink-0 snap-start">
                        <CategoryCard category={category} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Best Sellers Section */}
      {bestSellers.length > 0 && (
        <section className="py-6 sm:py-8 md:py-12 lg:py-16 [@media(max-height:720px)]:py-5 [@media(max-height:720px)]:sm:py-6">
          <Container>
            <div className="flex items-start justify-between mb-4 md:mb-6 px-3 sm:px-4 md:px-0">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow">
                  Best Sellers
                </h2>
                <p className="text-gray-600 mt-1">Most loved picks, trending right now</p>
              </div>
            </div>
            <ProductGrid products={bestSellers.slice(0, 8)} cardVariant="flat" />

            {/* Bottom center "See all →" */}
            <div className="mt-8 flex justify-center px-4 md:px-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-violet-700 hover:text-violet-800 transition"
              >
                <span>See all</span>
                <ArrowRight size={16} className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Container>
        </section>
      )}

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

      {/* Featured Products Grid (8 items) */}
      {featuredProducts.length > 0 && (
        <section className="py-6 sm:py-8 md:py-12 lg:py-16 [@media(max-height:720px)]:py-5 [@media(max-height:720px)]:sm:py-6">
          <Container>
            <div className="flex items-center justify-between mb-4 md:mb-6 px-3 sm:px-4 md:px-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Featured Products</h2>
              <Link href="/products" className="text-primary-dark hover:text-primary-dark font-semibold text-sm md:text-base">
                Show More
              </Link>
            </div>
            <ProductGrid products={featuredProducts.slice(0, 8)} cardVariant="flat" />
          </Container>
        </section>
      )}

      {/* Order Again Section */}
      {newArrivals.length > 0 && (
        <section className="py-6 sm:py-8 md:py-12 lg:py-16 bg-white [@media(max-height:720px)]:py-5 [@media(max-height:720px)]:sm:py-6">
          <Container>
            <div className="mb-4 md:mb-6 px-3 sm:px-4 md:px-0">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-800 font-headingnow leading-[1]">
                Buy Again
              </h2>
              <p className="mt-2 text-[13px] md:text-sm text-gray-500">
                Your frequently purchased items, ready to reorder.
              </p>
            </div>

            {/* Category carousel */}
            {categories.length > 0 && (
              <div className="w-screen relative left-1/2 -translate-x-1/2 mb-5">
                <div className="overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
                  <div className="flex w-max gap-2 px-4 mx-auto">
                    <button
                      type="button"
                      onClick={() => setOrderAgainCategoryId(null)}
                      className={`snap-start flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                        orderAgainCategoryId == null
                          ? 'border-gray-900 bg-gray-900/5 text-gray-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>All</span>
                    </button>

                    {categories.map((cat) => {
                      const active = orderAgainCategoryId != null && String(orderAgainCategoryId) === String(cat.id);
                      const src = getCategoryImageSrc(cat);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setOrderAgainCategoryId(cat.id)}
                          className={`snap-start flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                            active
                              ? 'border-gray-900 bg-gray-900/5 text-gray-900'
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

            {/* Products carousel (2-ish cards per view) */}
            <div className="w-screen relative left-1/2 -translate-x-1/2">
              <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory">
                <div className="flex w-max gap-2 px-4">
                  {orderAgainProducts.slice(0, 12).map((product) => (
                    <div key={product.id} className="snap-start flex-shrink-0">
                      <ProductCard product={product} isCarousel />
                    </div>
                  ))}
                </div>
              </div>

              {/* Second products carousel (next set) */}
              {orderAgainProducts.length > 12 && (
                <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory mt-3">
                  <div className="flex w-max gap-2 px-4">
                    {orderAgainProducts.slice(12, 24).map((product) => (
                      <div key={product.id} className="snap-start flex-shrink-0">
                        <ProductCard product={product} isCarousel />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Third products carousel (next set) */}
              {orderAgainProducts.length > 24 && (
                <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory mt-3">
                  <div className="flex w-max gap-2 px-4">
                    {orderAgainProducts.slice(24, 36).map((product) => (
                      <div key={product.id} className="snap-start flex-shrink-0">
                        <ProductCard product={product} isCarousel />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {orderAgainSelectedCategory && orderAgainProducts.length === 0 && (
                <div className="px-4 pb-2 text-sm text-gray-500">
                  No products found for{' '}
                  <span className="font-semibold text-gray-800">{orderAgainSelectedCategory.name}</span>.
                </div>
              )}
            </div>

            {/* Bottom center "See all →" */}
            <div className="mt-6 flex justify-center px-4 md:px-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-gray-800 hover:text-gray-900 transition"
              >
                <span>See all</span>
                <ArrowRight size={16} className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* Shop by Category — uniform card grid */}
      {allCategories.length > 0 && (
        <section className="py-6 sm:py-8 md:py-12 lg:py-16 bg-white [@media(max-height:720px)]:py-5 [@media(max-height:720px)]:sm:py-6">
          <Container>
            <div className="mb-5 sm:mb-6 md:mb-8 px-3 sm:px-4 md:px-0">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                Shop by Category
              </h2>
              <p className="mt-2 text-[13px] md:text-sm text-gray-500">
                Browse every category — find what you need, fast.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:gap-4 px-3 sm:px-4 md:px-0">
              {allCategories.map((category) => (
                <HomeShopCategoryCard key={category.id ?? category.name} category={category} />
              ))}
            </div>
          </Container>
        </section>
      )}

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

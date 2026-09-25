'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys, useCategoriesTree, useProducts, useRootCategories } from '../hooks/useProducts';
import { homeSectionKeys } from '../hooks/useHomeSections';
import { useLoginNavigation } from '../hooks/useLoginNavigation';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { PRESSABLE_ICON_BTN_SOFT } from '../components/ui/brandButton';
import { useAlert } from '../context/AlertContext';
import { useLocationService } from '../context/LocationServiceContext';
import { useAuth } from '../context/AuthContext';
import { useShopBranding } from '../context/ShopBrandingContext';
import { useAddress } from '../context/AddressContext';
import ProductCard from '../components/ProductCard';
import Container from '../components/Container';
import FloatingViewCartPill from '../components/FloatingViewCartPill';
import BannerCarousel from '../components/BannerCarousel';
import HomeSections from '../components/home/HomeSections';
import HomeClientShelves from '../components/home/HomeClientShelves';
import HomeCategoryRail from '../components/home/HomeCategoryRail';
import SmoothDragRail from '../components/motion/SmoothDragRail';
import ProductSearchExperience from '../components/search/ProductSearchExperience';
import { dedupeProductsByVariantGroup } from '../utils/productUtils';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../utils/categoryImage';
import { formatAddressDisplay } from '../utils/formatAddress';
import { Bone, ProductCarouselRowSkeleton } from '../components/skeletons/primitives';
import { getAppScrollY } from '../lib/pwa/appShell';
import {
  ArrowRightRegular as ArrowRight,
  ClassifyFilled as Classify,
  DownRegular as ChevronDown,
  ShopFilled as Shop,
  User1Regular as User,
} from '../components/icons';
import {
  CATEGORY_ID_UUID,
  isAllCategorySentinel,
  isAllNamedCategory,
} from '../components/products/productsBrowseConstants';

/** Exact admin category names for Fresh Zone (fixed tab order). */
const FRESH_ZONE_CATEGORY_NAMES = ['Vegetables', 'Fruits', 'Dairy'];

function flattenCategoryNodes(node) {
  if (!node) return [];
  const out = [node];
  for (const child of node.children || []) {
    out.push(...flattenCategoryNodes(child));
  }
  return out;
}

function flattenCategoryForest(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap((n) => flattenCategoryNodes(n));
}

function formatHomeAddressLine(address) {
  if (!address) return '';
  return [address.street || address.line1, address.city]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

/** Depth-first exact name match (`name.trim() === expected`). Skips inactive nodes. */
function findCategoryByExactName(nodes, name) {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node?.isActive === false) continue;
    if (String(node?.name ?? '').trim() === name) return node;
    const found = findCategoryByExactName(node.children || [], name);
    if (found) return found;
  }
  return null;
}

/**
 * Root + all descendants via parent_id links (string-normalized).
 * Survives broken nested `children` arrays as long as flat parent links exist.
 */
function collectDescendantCategoryIds(flat, rootId) {
  if (rootId == null || !Array.isArray(flat)) return [];
  const root = String(rootId);
  const byParent = new Map();
  for (const c of flat) {
    if (!c || c.isActive === false) continue;
    const id = c.id ?? c._id;
    if (id == null) continue;
    const pid = c.parentId != null ? String(c.parentId) : c.parent_id != null ? String(c.parent_id) : null;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(String(id));
  }
  const out = [];
  const stack = [root];
  const seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    const kids = byParent.get(id) || [];
    for (let i = kids.length - 1; i >= 0; i -= 1) stack.push(kids[i]);
  }
  return out;
}

export default function Home() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [searchActive, setSearchActive] = useState(false);
   
  const { showAlert } = useAlert();
  const { isAuthenticated } = useAuth();
  const { goToLogin } = useLoginNavigation();
  const { navigate, prefetch } = useAppNavigation();
  const [profileNavPending, setProfileNavPending] = useState(false);
  const {
    isChecking: isLocationChecking,
    serviceable: isServiceable,
    placeLabel: checkedPlaceLabel,
    recheckLocation,
    openServiceAreaSheet,
  } = useLocationService();
  const { shopId, shopName, shopImage, bannerEnabled, bannerImages } = useShopBranding();
  const { getDefaultAddress, addresses } = useAddress();

  const isLocalDev = process.env.NODE_ENV !== 'production';

  // Warm profile/login so the header icon opens without a cold wait.
  useEffect(() => {
    prefetch(isAuthenticated ? '/profile' : '/login');
  }, [isAuthenticated, prefetch]);

  const handleProfilePress = () => {
    if (profileNavPending) return;
    setProfileNavPending(true);
    if (isAuthenticated) {
      navigate('/profile');
      return;
    }
    goToLogin();
  };

  // If navigation stalls (offline / blocked), don't leave the icon spinning forever.
  useEffect(() => {
    if (!profileNavPending) return undefined;
    const t = window.setTimeout(() => setProfileNavPending(false), 8000);
    return () => window.clearTimeout(t);
  }, [profileNavPending]);

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
        queryClient.invalidateQueries({ queryKey: productKeys.lists(shopId) }),
        queryClient.invalidateQueries({
          queryKey: [...productKeys.categories(shopId), 'tree'],
        }),
        queryClient.invalidateQueries({ queryKey: productKeys.categoryRoots(shopId) }),
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

  // Catalog for home shelves; Fresh Zone loads from exact Vegetables / Fruits / Dairy categories.
  // Top Category rail uses roots only — do NOT fetch full tree until Fresh Zone is near viewport
  // (all=true competes with roots/products and delays the above-the-fold chips).
  const freshZoneSectionRef = useRef(null);
  const [freshZoneNear, setFreshZoneNear] = useState(false);

  useEffect(() => {
    const el = freshZoneSectionRef.current;
    if (!el) {
      setFreshZoneNear(true);
      return undefined;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setFreshZoneNear(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setFreshZoneNear(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: '320px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { data: categoryTree, isLoading: categoryTreeLoading } = useCategoriesTree({
    enabled: freshZoneNear,
  });
  const { data: catalogData } = useProducts({
    limit: 24,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const catalogProducts = useMemo(
    () => dedupeProductsByVariantGroup(catalogData?.products || []),
    [catalogData?.products]
  );

  const { data: rootCategoriesData, isLoading: rootCategoriesLoading } = useRootCategories();
  const rootCategories = useMemo(
    () =>
      (rootCategoriesData || []).filter(
        (c) => c && c.isActive !== false && !isAllNamedCategory(c)
      ),
    [rootCategoriesData]
  );
  const [homeCategoryId, setHomeCategoryId] = useState('all');

  useEffect(() => {
    if (isAllCategorySentinel(homeCategoryId)) return;
    if (!rootCategories.length) {
      setHomeCategoryId('all');
      return;
    }
    const stillExists = rootCategories.some(
      (c) => String(c.id ?? c._id) === String(homeCategoryId)
    );
    if (!stillExists) {
      setHomeCategoryId('all');
    }
  }, [rootCategories, homeCategoryId]);

  const selectedHomeCategory = useMemo(
    () =>
      isAllCategorySentinel(homeCategoryId)
        ? null
        : rootCategories.find((c) => String(c.id ?? c._id) === String(homeCategoryId)) || null,
    [rootCategories, homeCategoryId]
  );

  const homeCategoryHref = isAllCategorySentinel(homeCategoryId)
    ? '/products'
    : selectedHomeCategory
      ? `/categories/${encodeURIComponent(
          selectedHomeCategory.slug || selectedHomeCategory.id || selectedHomeCategory._id
        )}`
      : '/categories';

  const homeShelfCategoryId =
    homeCategoryId &&
    !isAllCategorySentinel(homeCategoryId) &&
    CATEGORY_ID_UUID.test(String(homeCategoryId))
      ? String(homeCategoryId)
      : '';

  const { data: homeCategoryProductsData, isLoading: homeCategoryProductsLoading } = useProducts({
    category_id: homeShelfCategoryId || undefined,
    include_descendants: Boolean(homeShelfCategoryId),
    limit: 4,
    sort_by: 'created_at',
    sort_order: 'desc',
    // Only fetch when a real category is selected — "all" already uses catalogData above.
    enabled: Boolean(homeShelfCategoryId),
  });

  const homeCategoryProducts = useMemo(
    () => dedupeProductsByVariantGroup(homeCategoryProductsData?.products || []).slice(0, 4),
    [homeCategoryProductsData?.products]
  );

  // Fresh Zone category tabs — All reuses home catalog; one tab = one category fetch.
  const [freshZoneCategoryId, setFreshZoneCategoryId] = useState(null);

  const freshZoneResolved = useMemo(() => {
    const tree = categoryTree || [];
    const flat = flattenCategoryForest(tree);
    return FRESH_ZONE_CATEGORY_NAMES.map((name) => {
      const category = findCategoryByExactName(tree, name);
      if (!category) return null;
      const rootId = category.id ?? category._id;
      const fromTree = collectDescendantCategoryIds(flat, rootId);
      // Merge nested children walk if flat missed anything (belt-and-suspenders).
      const fromNested = flattenCategoryNodes(category)
        .filter((c) => c?.isActive !== false)
        .map((c) => c?.id ?? c?._id)
        .filter((id) => id != null)
        .map(String);
      const categoryIds = [...new Set([...fromTree, ...fromNested])];
      if (!categoryIds.length) return null;
      return { category, categoryIds, name };
    }).filter(Boolean);
  }, [categoryTree]);

  const freshZoneCategoryIdSet = useMemo(() => {
    const ids = new Set();
    for (const row of freshZoneResolved) {
      for (const id of row.categoryIds) ids.add(String(id));
    }
    return ids;
  }, [freshZoneResolved]);

  /** "All" tab: filter home catalog — no parallel Fresh Zone list fan-out. */
  const freshZoneFromCatalog = useMemo(() => {
    if (!freshZoneCategoryIdSet.size) return [];
    return catalogProducts.filter((p) => {
      const cid = String(p?.category_id ?? p?.categoryId ?? p?.category?.id ?? '');
      return cid && freshZoneCategoryIdSet.has(cid);
    });
  }, [catalogProducts, freshZoneCategoryIdSet]);

  const selectedFreshZoneRootId =
    freshZoneCategoryId != null && CATEGORY_ID_UUID.test(String(freshZoneCategoryId))
      ? String(freshZoneCategoryId)
      : '';

  const {
    data: freshZoneTabProductsData,
    isLoading: freshZoneTabLoading,
  } = useProducts({
    category_id: selectedFreshZoneRootId || undefined,
    include_descendants: Boolean(selectedFreshZoneRootId),
    limit: 12,
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: Boolean(selectedFreshZoneRootId),
  });

  const freshZoneTabProducts = useMemo(
    () => dedupeProductsByVariantGroup(freshZoneTabProductsData?.products || []),
    [freshZoneTabProductsData?.products],
  );

  const freshZoneLoading =
    categoryTreeLoading || (Boolean(selectedFreshZoneRootId) && freshZoneTabLoading);

  const freshZoneDisplayCategories = useMemo(() => {
    if (!freshZoneFromCatalog.length && !selectedFreshZoneRootId) {
      // Still show tabs once catalog may be empty but categories resolved (tab fetch can fill).
      return freshZoneResolved.map((row) => row.category);
    }
    return freshZoneResolved
      .filter((row) => {
        if (selectedFreshZoneRootId && String(row.category.id ?? row.category._id) === selectedFreshZoneRootId) {
          return true;
        }
        const idSet = new Set(row.categoryIds.map(String));
        return freshZoneFromCatalog.some((p) => {
          const cid = String(p?.category_id ?? p?.categoryId ?? p?.category?.id ?? '');
          return cid && idSet.has(cid);
        });
      })
      .map((row) => row.category);
  }, [freshZoneFromCatalog, freshZoneResolved, selectedFreshZoneRootId]);

  const freshZoneSelectedCategory =
    freshZoneCategoryId == null
      ? null
      : freshZoneDisplayCategories.find((c) => String(c.id) === String(freshZoneCategoryId)) ||
        null;

  useEffect(() => {
    if (freshZoneCategoryId == null) return;
    const stillExists = freshZoneDisplayCategories.some(
      (c) => String(c.id) === String(freshZoneCategoryId)
    );
    if (!stillExists) setFreshZoneCategoryId(null);
  }, [freshZoneCategoryId, freshZoneDisplayCategories]);

  const freshZoneDisplayProducts = useMemo(() => {
    if (freshZoneCategoryId == null) return freshZoneFromCatalog;
    return freshZoneTabProducts;
  }, [freshZoneCategoryId, freshZoneFromCatalog, freshZoneTabProducts]);

  const locationSubtitle = useMemo(() => {
    if (isLocationChecking) return 'Checking your area…';
    const fromAddress = formatHomeAddressLine(getDefaultAddress());
    if (fromAddress) return fromAddress;
    const fromCheck = String(checkedPlaceLabel || '').trim();
    if (fromCheck) return fromCheck;
    if (isServiceable === true) return 'We deliver to your area';
    if (isServiceable === false) return 'Not available in your area';
    return 'Select delivery location';
  }, [
    addresses,
    checkedPlaceLabel,
    getDefaultAddress,
    isLocationChecking,
    isServiceable,
  ]);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    showAlert('Thank you for subscribing!', 'Success', 'success');
    setEmail('');
  };

  return (
    <div
      className="w-full max-w-full"
      onTouchStart={(e) => {
        if (typeof window === 'undefined') return;
        if (getAppScrollY() > 0) return;
        const y = e.touches?.[0]?.clientY;
        if (!Number.isFinite(y)) return;
        ptrRef.current.startY = y;
        ptrRef.current.pulling = true;
      }}
      onTouchMove={(e) => {
        if (!ptrRef.current.pulling) return;
        if (typeof window === 'undefined') return;
        if (getAppScrollY() > 0) return;
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

      {/* Home top: location + search + banner */}
      <section className="w-full bg-white pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div
          className={
            searchActive
              ? 'relative z-[72] bg-white pb-3 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition-[box-shadow] duration-200 ease-out motion-reduce:transition-none'
              : 'transition-[box-shadow] duration-200 ease-out motion-reduce:transition-none'
          }
        >
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5">
            <button
              type="button"
              onClick={() => openServiceAreaSheet()}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              aria-label="Change delivery location"
            >
              {shopImage ? (
                <span className="flex h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#902bf5]/10 ring-2 ring-[#902bf5]/35">
                  <img
                    src={shopImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#902bf5]/10 ring-2 ring-[#902bf5]/35">
                  <Shop size={22} color="#902bf5" className="h-[22px] w-[22px]" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="inline-flex max-w-full items-center gap-0.5">
                  <span className="truncate text-[16px] font-extrabold leading-tight text-gray-900">
                    {shopName || 'Yaadro'}
                  </span>
                  <ChevronDown size={16} color="#111827" className="h-4 w-4 shrink-0" aria-hidden />
                </span>
                <span className="mt-0.5 block truncate text-[12px] leading-snug text-gray-500">
                  {locationSubtitle}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleProfilePress}
              onPointerEnter={() => prefetch(isAuthenticated ? '/profile' : '/login')}
              disabled={profileNavPending}
              aria-busy={profileNavPending}
              aria-label={
                profileNavPending
                  ? isAuthenticated
                    ? 'Opening profile'
                    : 'Opening login'
                  : isAuthenticated
                    ? 'Profile'
                    : 'Login'
              }
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white ring-2 ring-[#902bf5]/45 ring-offset-2 ring-offset-white hover:bg-gray-50 hover:ring-[#902bf5]/70 disabled:opacity-100 ${PRESSABLE_ICON_BTN_SOFT} ${
                profileNavPending ? 'scale-95 bg-violet-50 ring-[#902bf5]/80' : ''
              }`}
            >
              {profileNavPending ? (
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2 border-[#902bf5]/25 border-t-[#902bf5] motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <User size={22} color="#111827" className="h-[22px] w-[22px]" />
              )}
            </button>
          </div>

          <div className="mt-3 px-4 sm:px-5">
            <ProductSearchExperience
              mode="overlay"
              onActiveChange={setSearchActive}
              placeholder="Search products…"
            />
          </div>
        </div>

        <div className="mt-5 px-4 sm:px-5">
          <p className="text-left text-home-hero-headline font-headingnow font-extrabold leading-[0.95] tracking-tight text-gray-900">
            Groceries to your <span className="text-[#902bf5]">doorstep ..</span>
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-[#902bf5] px-6 py-3 text-[13px] font-extrabold tracking-wide text-white shadow-[0_12px_30px_rgba(144,43,245,0.28)] transition hover:bg-[#7d24d6] active:scale-[0.98]"
          >
            Shop Now
          </Link>
        </div>

        {shopBanners.length > 0 ? (
          <div className="mt-4 px-4 sm:px-5">
            <div className="overflow-hidden rounded-2xl bg-white">
              <BannerCarousel
                banners={shopBanners}
                fallbackToDefaults={false}
                imageClassName="object-cover object-center"
                className="bg-white"
              />
            </div>
          </div>
        ) : null}

        <HomeCategoryRail
          categories={rootCategories}
          selectedId={homeCategoryId}
          onSelect={(category) => {
            if (isAllCategorySentinel(category?.id ?? category?._id ?? category)) {
              setHomeCategoryId('all');
              return;
            }
            const id = String(category?.id ?? category?._id ?? '');
            if (id) setHomeCategoryId(id);
          }}
          isLoading={rootCategoriesLoading}
        />

        {homeCategoryId ? (
          <div className="mt-5 pb-2">
            {homeCategoryProductsLoading && homeCategoryProducts.length === 0 ? (
              <SmoothDragRail
                className="pb-3"
                trackClassName="items-stretch gap-3 px-4 sm:px-5"
                ariaLabel="Loading category products"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex w-[173px] shrink-0 flex-col gap-2">
                    <Bone className="aspect-square w-full rounded-2xl" />
                    <Bone className="h-2.5 w-16 rounded" />
                    <Bone className="h-4 w-full rounded" />
                    <Bone className="h-4 w-12 rounded" />
                  </div>
                ))}
              </SmoothDragRail>
            ) : homeCategoryProducts.length > 0 ? (
              <SmoothDragRail
                className="pb-3"
                trackClassName="items-stretch gap-3 px-4 sm:px-5"
                ariaLabel="Category products"
              >
                {homeCategoryProducts.map((product) => (
                  <div key={product.id} className="flex h-full flex-shrink-0">
                    <ProductCard product={product} isCarousel />
                  </div>
                ))}
              </SmoothDragRail>
            ) : null}
            <div className="mt-4 flex justify-center px-4 sm:px-5">
              <Link
                href={homeCategoryHref}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#902bf5] transition hover:text-[#7d24d6]"
              >
                <span>
                  {selectedHomeCategory?.name
                    ? `Show all ${selectedHomeCategory.name}`
                    : 'Show all'}
                </span>
                <ArrowRight size={16} className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <div className="relative z-10 mt-2">
        <HomeSections />
      </div>

      {/* Fresh Zone — tree fetch is deferred until this section nears the viewport */}
      <section
        ref={freshZoneSectionRef}
        className="fresh-zone-minh relative overflow-hidden bg-white rounded-none my-4 sm:my-6 min-h-[12rem]"
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
              className="h-full w-full object-cover object-center"
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
            {/* Category tabs — same chip selection effect as home / products rail */}
            {freshZoneDisplayCategories.length > 0 && (
              <div className="w-full mb-6 sm:mb-8">
                <SmoothDragRail
                  className="pb-1"
                  trackClassName="items-start gap-3 px-4 sm:px-5"
                  ariaLabel="Fresh zone categories"
                >
                  <button
                    type="button"
                    onClick={() => setFreshZoneCategoryId(null)}
                    aria-pressed={freshZoneCategoryId == null}
                    className={[
                      'group flex w-[80px] shrink-0 flex-col items-center gap-2',
                      'touch-manipulation transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]',
                      'active:scale-[0.88]',
                      freshZoneCategoryId == null ? 'scale-[1.02]' : 'scale-100',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'rounded-[24px] p-[3px] transition-all duration-200',
                        freshZoneCategoryId == null
                          ? 'bg-gradient-to-br from-[#902bf5] to-[#c084fc] shadow-[0_10px_24px_rgba(144,43,245,0.35)]'
                          : 'bg-transparent group-hover:bg-[#902bf5]/15',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[21px] transition-all duration-200',
                          freshZoneCategoryId == null
                            ? 'bg-white ring-2 ring-white'
                            : 'bg-gray-50/90 ring-1 ring-white/40 group-hover:ring-[#902bf5]/25',
                        ].join(' ')}
                      >
                        <Classify size={28} className="text-[#902bf5]" aria-hidden />
                      </span>
                    </span>
                    <span
                      className={[
                        'max-w-[80px] truncate text-center text-[11px] font-bold uppercase leading-tight tracking-wide transition-colors duration-200',
                        freshZoneCategoryId == null ? 'text-white' : 'text-white/80',
                      ].join(' ')}
                    >
                      ALL
                    </span>
                    <span
                      className={[
                        'h-1 w-6 rounded-full transition-all duration-200',
                        freshZoneCategoryId == null
                          ? 'scale-100 bg-white opacity-100'
                          : 'scale-75 bg-transparent opacity-0',
                      ].join(' ')}
                      aria-hidden
                    />
                  </button>

                  {freshZoneDisplayCategories.map((cat) => {
                    const active =
                      freshZoneCategoryId != null &&
                      String(freshZoneCategoryId) === String(cat.id);
                    const src = getCategoryImageUrl(cat) || CATEGORY_DUMMY_IMAGE;
                    const name = String(cat.name || 'Category').trim();
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFreshZoneCategoryId(cat.id)}
                        aria-pressed={active}
                        aria-label={name}
                        className={[
                          'group flex w-[80px] shrink-0 flex-col items-center gap-2',
                          'touch-manipulation transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]',
                          'active:scale-[0.88]',
                          active ? 'scale-[1.02]' : 'scale-100',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'rounded-[24px] p-[3px] transition-all duration-200',
                            active
                              ? 'bg-gradient-to-br from-[#902bf5] to-[#c084fc] shadow-[0_10px_24px_rgba(144,43,245,0.35)]'
                              : 'bg-transparent group-hover:bg-[#902bf5]/15',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[21px] transition-all duration-200',
                              active
                                ? 'bg-white ring-2 ring-white'
                                : 'bg-gray-50/90 ring-1 ring-white/40 group-hover:ring-[#902bf5]/25',
                            ].join(' ')}
                          >
                            <img
                              src={src}
                              alt=""
                              className={[
                                'h-full w-full object-cover object-center transition-transform duration-200 group-active:scale-95',
                                active ? 'scale-[1.04]' : '',
                              ].join(' ')}
                              onError={(e) => {
                                e.currentTarget.src = CATEGORY_DUMMY_IMAGE;
                              }}
                            />
                            {active ? (
                              <span
                                className="pointer-events-none absolute inset-0 rounded-[21px] bg-[#902bf5]/12"
                                aria-hidden
                              />
                            ) : null}
                          </span>
                        </span>
                        <span
                          className={[
                            'max-w-[80px] truncate text-center text-[11px] font-bold uppercase leading-tight tracking-wide transition-colors duration-200',
                            active ? 'text-white' : 'text-white/80',
                          ].join(' ')}
                        >
                          {name}
                        </span>
                        <span
                          className={[
                            'h-1 w-6 rounded-full transition-all duration-200',
                            active
                              ? 'scale-100 bg-white opacity-100'
                              : 'scale-75 bg-transparent opacity-0',
                          ].join(' ')}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </SmoothDragRail>

                {freshZoneSelectedCategory ? (
                  <div
                    key={String(freshZoneSelectedCategory.id)}
                    className="mt-5 animate-fade-in px-4 text-center sm:px-5"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                      Browsing
                    </p>
                    <h3 className="mt-1 font-headingnow text-[2rem] font-extrabold uppercase leading-none tracking-wide text-white sm:text-[2.4rem]">
                      {freshZoneSelectedCategory.name}
                    </h3>
                  </div>
                ) : null}
              </div>
            )}

            {/* Products (carousel) — fade in when category changes */}
            <div
              key={
                freshZoneCategoryId == null
                  ? 'fresh-all'
                  : String(freshZoneCategoryId)
              }
              className="w-full animate-fade-in"
            >
              <SmoothDragRail
                className="pb-3"
                trackClassName="items-stretch gap-3 px-4"
                ariaLabel="Fresh zone products"
              >
                  {freshZoneDisplayProducts.slice(0, 12).map((product) => (
                    <div key={product.id} className="flex h-full flex-shrink-0">
                      <ProductCard product={product} isCarousel />
                    </div>
                  ))}
              </SmoothDragRail>
              {freshZoneSelectedCategory && freshZoneDisplayProducts.length === 0 && (
                <div className="px-4 pb-2 text-sm text-white/80">
                  No products found for <span className="font-semibold text-white">{freshZoneSelectedCategory.name}</span>.
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

        {!freshZoneLoading && freshZoneDisplayProducts.length === 0 && (
          <Container className="relative z-[2] py-10 sm:py-14 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 font-headingnow">FRESH ZONE</h2>
            <p className="mt-2 text-gray-500">Fresh picks coming soon.</p>
          </Container>
        )}
      </section>

      <HomeClientShelves products={catalogProducts} />

      <FloatingViewCartPill />
    </div>
  );
}

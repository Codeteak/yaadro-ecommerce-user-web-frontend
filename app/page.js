'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productKeys, useCategoriesTree, useProducts, useRootCategories } from '../hooks/useProducts';
import { homeSectionKeys } from '../hooks/useHomeSections';
import { useLoginNavigation } from '../hooks/useLoginNavigation';
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
import HomeSearchHints from '../components/home/HomeSearchHints';
import SmoothDragRail from '../components/motion/SmoothDragRail';
import { dedupeProductsByVariantGroup } from '../utils/productUtils';
import { getProducts } from '../utils/productApi';
import { getCategoryImageUrl, CATEGORY_DUMMY_IMAGE } from '../utils/categoryImage';
import { Bone, ProductCarouselRowSkeleton } from '../components/skeletons/primitives';
import { getAppScrollY } from '../lib/pwa/appShell';
import {
  ArrowRightRegular as ArrowRight,
  ClassifyFilled as Classify,
  DownRegular as ChevronDown,
  ShopFilled as Shop,
  SearchRegular as Search,
  User1Regular as User,
} from '../components/icons';

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
  return [address.street || address.line1, address.city, address.state]
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
   
  const { showAlert } = useAlert();
  const { isAuthenticated } = useAuth();
  const { goToLogin } = useLoginNavigation();
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
        queryClient.invalidateQueries({
          queryKey: [...productKeys.shop(shopId), 'fresh-zone'],
        }),
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
  const { data: categoryTree, isLoading: categoryTreeLoading } = useCategoriesTree();
  const { data: catalogData } = useProducts({
    limit: 24,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const catalogProducts = useMemo(
    () => dedupeProductsByVariantGroup(catalogData?.products || []),
    [catalogData?.products]
  );
  const searchHintNames = useMemo(
    () => catalogProducts.map((product) => product?.name).filter(Boolean),
    [catalogProducts]
  );

  const { data: rootCategoriesData, isLoading: rootCategoriesLoading } = useRootCategories();
  const rootCategories = useMemo(
    () => (rootCategoriesData || []).filter((c) => c && c.isActive !== false),
    [rootCategoriesData]
  );
  const [homeCategoryId, setHomeCategoryId] = useState(null);

  useEffect(() => {
    if (!rootCategories.length) return;
    const stillExists = rootCategories.some(
      (c) => String(c.id ?? c._id) === String(homeCategoryId)
    );
    if (homeCategoryId == null || !stillExists) {
      setHomeCategoryId(String(rootCategories[0].id ?? rootCategories[0]._id));
    }
  }, [rootCategories, homeCategoryId]);

  const selectedHomeCategory = useMemo(
    () =>
      rootCategories.find((c) => String(c.id ?? c._id) === String(homeCategoryId)) || null,
    [rootCategories, homeCategoryId]
  );

  const homeCategoryHref = selectedHomeCategory
    ? `/categories/${encodeURIComponent(
        selectedHomeCategory.slug || selectedHomeCategory.id || selectedHomeCategory._id
      )}`
    : '/categories';

  const { data: homeCategoryProductsData, isLoading: homeCategoryProductsLoading } = useProducts({
    category_id: homeCategoryId || undefined,
    include_descendants: true,
    limit: 4,
    sort_by: 'created_at',
    sort_order: 'desc',
    enabled: Boolean(homeCategoryId),
  });

  const homeCategoryProducts = useMemo(
    () => dedupeProductsByVariantGroup(homeCategoryProductsData?.products || []).slice(0, 4),
    [homeCategoryProductsData?.products]
  );

  // Fresh Zone category tabs
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

  const freshZoneFetchKey = useMemo(
    () =>
      freshZoneResolved.map((r) => ({
        id: String(r.category.id ?? r.category._id),
        ids: r.categoryIds,
      })),
    [freshZoneResolved]
  );

  const {
    data: freshZoneByCategory,
    isLoading: freshZoneProductsLoading,
  } = useQuery({
    queryKey: [...productKeys.shop(shopId), 'fresh-zone', freshZoneFetchKey],
    enabled: freshZoneResolved.length > 0 && !!shopId,
    staleTime: 1000 * 45,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const rows = await Promise.all(
        freshZoneResolved.map(async ({ category, categoryIds }) => {
          const rootId = String(category.id ?? category._id);
          // Root + descendants (local DB CTE). Also fetch each known child id so
          // upstream APIs that ignore include_descendants still return Ghee SKUs.
          const lists = await Promise.all(
            categoryIds.map((category_id) =>
              getProducts({
                category_id,
                include_descendants: category_id === rootId,
                limit: 24,
                sort_by: 'created_at',
                sort_order: 'desc',
              })
            )
          );
          const products = dedupeProductsByVariantGroup(
            lists.flatMap((list) => list?.products || [])
          );
          return { category, categoryIds, products };
        })
      );
      return rows;
    },
  });

  const freshZoneLoading =
    categoryTreeLoading || (freshZoneResolved.length > 0 && freshZoneProductsLoading);

  const freshZoneDisplayCategories = useMemo(
    () =>
      (freshZoneByCategory || [])
        .filter((row) => Array.isArray(row.products) && row.products.length > 0)
        .map((row) => row.category),
    [freshZoneByCategory]
  );

  const freshZoneDisplayProductsBase = useMemo(() => {
    const rows = (freshZoneByCategory || []).filter(
      (row) => Array.isArray(row.products) && row.products.length > 0
    );
    return dedupeProductsByVariantGroup(rows.flatMap((row) => row.products));
  }, [freshZoneByCategory]);

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
    if (freshZoneCategoryId == null) return freshZoneDisplayProductsBase;
    const row = (freshZoneByCategory || []).find(
      (r) => String(r.category.id ?? r.category._id) === String(freshZoneCategoryId)
    );
    return row?.products || [];
  }, [freshZoneCategoryId, freshZoneByCategory, freshZoneDisplayProductsBase]);

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
            onClick={() => {
              if (isAuthenticated) {
                window.location.href = '/profile';
              } else {
                goToLogin();
              }
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white ring-2 ring-[#902bf5]/45 ring-offset-2 ring-offset-white transition hover:bg-gray-50 hover:ring-[#902bf5]/70"
            aria-label={isAuthenticated ? 'Profile' : 'Login'}
          >
            <User size={22} color="#111827" className="h-[22px] w-[22px]" />
          </button>
        </div>

        <div className="mt-3 px-4 sm:px-5">
          <Link
            href="/search/"
            className="flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 ring-2 ring-[#902bf5]/45 ring-offset-2 ring-offset-white transition hover:bg-gray-50 hover:ring-[#902bf5]/70"
            aria-label="Search products"
          >
            <Search size={20} color="#6b7280" className="h-5 w-5 shrink-0" />
            <HomeSearchHints productNames={searchHintNames} />
          </Link>
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
                <span>Show all</span>
                <ArrowRight size={16} className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <div className="relative z-10 mt-2">
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
              <div className="w-full mb-10">
                <SmoothDragRail
                  className="pb-1"
                  trackClassName="items-center gap-2 px-4"
                  ariaLabel="Fresh zone categories"
                >
                  <button
                    type="button"
                    onClick={() => setFreshZoneCategoryId(null)}
                    className={`h-11 flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 text-sm font-semibold transition whitespace-nowrap ${
                      freshZoneCategoryId == null
                        ? 'border-violet-600 bg-violet-50 text-violet-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                      <Classify size={16} className="text-violet-700" aria-hidden />
                    </span>
                    <span>All</span>
                  </button>

                  {freshZoneDisplayCategories.map((cat) => {
                    const active = freshZoneCategoryId != null && String(freshZoneCategoryId) === String(cat.id);
                    const src = getCategoryImageUrl(cat) || CATEGORY_DUMMY_IMAGE;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFreshZoneCategoryId(cat.id)}
                        className={`h-11 flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 text-sm font-semibold transition whitespace-nowrap ${
                          active
                            ? 'border-violet-600 bg-violet-50 text-violet-800'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="relative h-7 w-7 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = CATEGORY_DUMMY_IMAGE;
                            }}
                          />
                        </span>
                        <span className="max-w-[9.5rem] truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </SmoothDragRail>
              </div>
            )}

            {/* Products (carousel) */}
            <div className="w-full">
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

        {!freshZoneLoading && freshZoneDisplayProducts.length === 0 && (
          <Container className="relative z-[2] py-10 sm:py-14 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 font-headingnow">FRESH ZONE</h2>
            <p className="mt-2 text-gray-500">Fresh picks coming soon.</p>
          </Container>
        )}
      </section>

      <HomeClientShelves products={catalogProducts} />

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

            {/* Legal links (restore when pages are ready)
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
            */}

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

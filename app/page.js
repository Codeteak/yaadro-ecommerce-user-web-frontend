'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys, useProducts, useRootCategories } from '../hooks/useProducts';
import { homeSectionKeys } from '../hooks/useHomeSections';
import { useLoginNavigation } from '../hooks/useLoginNavigation';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { PRESSABLE_ICON_BTN_SOFT } from '../components/ui/brandButton';
import { useLocationService } from '../context/LocationServiceContext';
import { useAuth } from '../context/AuthContext';
import { useShopBranding } from '../context/ShopBrandingContext';
import { useAddress } from '../context/AddressContext';
import ProductCard from '../components/ProductCard';
import BannerCarousel from '../components/BannerCarousel';
import HomeSections from '../components/home/HomeSections';
import HomeCategoryRail from '../components/home/HomeCategoryRail';
import SmoothDragRail from '../components/motion/SmoothDragRail';
import ProductSearchExperience from '../components/search/ProductSearchExperience';
import { dedupeProductsByVariantGroup } from '../utils/productUtils';
import { Bone } from '../components/skeletons/primitives';
import { getAppScrollY } from '../lib/pwa/appShell';
import {
  ArrowRightRegular as ArrowRight,
  DownRegular as ChevronDown,
  ShopFilled as Shop,
  User1Regular as User,
} from '../components/icons';
import {
  CATEGORY_ID_UUID,
  isAllCategorySentinel,
  isAllNamedCategory,
} from '../components/products/productsBrowseConstants';

function formatHomeAddressLine(address) {
  if (!address) return '';
  return [address.street || address.line1, address.city]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

export default function Home() {
  const queryClient = useQueryClient();
  const [searchActive, setSearchActive] = useState(false);
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
    if (!Array.isArray(bannerImages) || bannerImages.length === 0) return [];
    if (bannerEnabled === false) return [];
    return bannerImages.map((url, index) => ({
      id: `shop-banner-${index}`,
      image: url,
    }));
  }, [bannerEnabled, bannerImages]);
  const [bannerSlotOpen, setBannerSlotOpen] = useState(() => shopBanners.length > 0);

  useEffect(() => {
    setBannerSlotOpen(shopBanners.length > 0);
  }, [shopBanners]);

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
      ? `/products?category=${encodeURIComponent(
          String(selectedHomeCategory.id || selectedHomeCategory._id || selectedHomeCategory.slug || '')
        )}`
      : '/products';

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
    // Only fetch when a real category is selected.
    enabled: Boolean(homeShelfCategoryId),
  });

  const homeCategoryProducts = useMemo(
    () => dedupeProductsByVariantGroup(homeCategoryProductsData?.products || []).slice(0, 4),
    [homeCategoryProductsData?.products]
  );

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

        {bannerSlotOpen && shopBanners.length > 0 ? (
          <div className="mt-4 px-4 sm:px-5">
            <div className="overflow-hidden rounded-2xl bg-white">
              <BannerCarousel
                banners={shopBanners}
                fallbackToDefaults={false}
                imageClassName="object-cover object-center"
                className="bg-white"
                onSlidesChange={(count) => setBannerSlotOpen(count > 0)}
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

    </div>
  );
}

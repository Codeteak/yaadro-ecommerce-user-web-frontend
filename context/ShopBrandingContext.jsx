'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  formatShopPageTitle,
  getCachedShopBranding,
  resolveShopBranding,
  shouldSkipLocalDevTenantFetch,
} from '../utils/shopResolver';
import { fetchShopSeoMetadata } from '../utils/seoApi';
import { applySeoBlockToDocument } from '../utils/seoBlock';
import { applyShopFavicon } from '../utils/shopFavicon';

/** Pathname (no trailing slash) → default document title segment before `| Shop Name`. */
const ROUTE_PAGE_TITLES = {
  '/cart': 'Cart',
  '/checkout': 'Checkout',
  '/login': 'Sign in',
  '/profile': 'My Profile',
  '/addresses': 'Addresses',
  '/add/address': 'Add address',
  '/orders': 'Your Orders',
  '/wishlist': 'Wishlist',
  '/search': 'Search',
  '/products': 'Products',
  '/categories': 'Categories',
  '/order-success': 'Order placed',
  '/order/track': 'Live tracking',
  '/product': 'Product',
};

function normalizePath(pathname) {
  if (!pathname) return '';
  const p = pathname.replace(/\/+$/, '') || '';
  return p === '/' ? '' : p;
}

function routePageTitle(pathname) {
  const path = normalizePath(pathname);
  if (path === '') return null;
  if (ROUTE_PAGE_TITLES[path] != null) return ROUTE_PAGE_TITLES[path];
  if (path.startsWith('/orders/')) return 'Order details';
  if (path.startsWith('/products/')) return 'Product';
  if (path.startsWith('/categories/')) return 'Category';
  return null;
}

function isProductDetailPath(pathname) {
  const path = normalizePath(pathname);
  return path.startsWith('/products/') && path !== '/products';
}

const ShopBrandingContext = createContext(null);

function initialCachedBranding() {
  return typeof window !== 'undefined' ? getCachedShopBranding() : null;
}

export function ShopBrandingProvider({ children }) {
  const pathname = usePathname();
  const [cachedBoot] = useState(initialCachedBranding);
  const [shopId, setShopId] = useState(() => cachedBoot?.shopId || '');
  const [shopName, setShopName] = useState(() => cachedBoot?.shopName || '');
  const [shopImage, setShopImage] = useState(() => cachedBoot?.shopImage || null);
  const [shopSeo, setShopSeo] = useState(() => cachedBoot?.seo || null);
  const [bannerEnabled, setBannerEnabled] = useState(() => Boolean(cachedBoot?.bannerEnabled));
  const [bannerImages, setBannerImages] = useState(() =>
    Array.isArray(cachedBoot?.bannerImages) ? cachedBoot.bannerImages : []
  );
  const [isResolving, setIsResolving] = useState(() => !cachedBoot?.shopId);
  const pageTitleRef = useRef(null);
  const resolveStartedRef = useRef(false);
  const brandingFetchInFlightRef = useRef(false);
  const visibilityRefreshAtRef = useRef(0);

  const applyDocumentTitle = useCallback(
    (pageTitle) => {
      pageTitleRef.current = pageTitle ?? null;
      const title = formatShopPageTitle(pageTitle, shopName);
      if (typeof document !== 'undefined') {
        document.title = title;
      }
    },
    [shopName]
  );

  const applyShopBrandingAssets = useCallback((_name, imageUrl) => {
    if (typeof document === 'undefined') return;
    applyShopFavicon(document, imageUrl);
  }, []);

  const applyResolvedBranding = useCallback(
    (result) => {
      if (!result) return;
      setShopId(result.shopId || '');
      setShopName(result.shopName || 'Yaadro');
      setShopImage(result.shopImage || null);
      setBannerEnabled(Boolean(result.bannerEnabled));
      setBannerImages(Array.isArray(result.bannerImages) ? result.bannerImages : []);
      if (result.seo) setShopSeo(result.seo);
      applyShopBrandingAssets(result.shopName, result.shopImage);
    },
    [applyShopBrandingAssets]
  );

  const refreshShopBranding = useCallback(
    async ({
      withSeoFallback = false,
      markResolving = false,
      forceRefresh = false,
    } = {}) => {
      if (brandingFetchInFlightRef.current) return;
      brandingFetchInFlightRef.current = true;
      let result = null;
      try {
        if (markResolving) setIsResolving(true);
        result = await resolveShopBranding({ forceRefresh });
        applyResolvedBranding(result);
      } finally {
        setIsResolving(false);
        brandingFetchInFlightRef.current = false;
      }

      if (!withSeoFallback) return;
      if (!result?.shopId) return;
      if (result.seo) return;
      const skipSeoFetch =
        typeof window !== 'undefined' &&
        shouldSkipLocalDevTenantFetch(window.location.hostname);
      if (skipSeoFetch) return;
      const fetched = await fetchShopSeoMetadata(result.shopId);
      if (fetched?.seo) setShopSeo(fetched.seo);
    },
    [applyResolvedBranding]
  );

  useLayoutEffect(() => {
    const cached = getCachedShopBranding();
    if (!cached?.shopId) return;
    applyResolvedBranding(cached);
    setIsResolving(false);
  }, [applyResolvedBranding]);

  useEffect(() => {
    if (resolveStartedRef.current) return;
    resolveStartedRef.current = true;
    // Paint from cache immediately, then revalidate once so a sticky wrong
    // shopId cannot blank the catalog until a hard cache clear.
    void (async () => {
      await refreshShopBranding({
        withSeoFallback: true,
        markResolving: !cachedBoot?.shopId,
      });
      if (cachedBoot?.shopId) {
        await refreshShopBranding({
          withSeoFallback: false,
          markResolving: false,
          forceRefresh: true,
        });
      }
    })();
  }, [cachedBoot?.shopId, refreshShopBranding]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      // Avoid resolve-by-domain on every brief tab switch / app resume.
      if (now - visibilityRefreshAtRef.current < 60_000) return;
      visibilityRefreshAtRef.current = now;
      // Force refresh so admin banner removals clear the sticky cache and
      // collapse the home carousel instead of leaving a gray placeholder.
      void refreshShopBranding({
        withSeoFallback: false,
        markResolving: false,
        forceRefresh: true,
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refreshShopBranding]);

  useEffect(() => {
    if (!shopName || isResolving) return;
    if (isProductDetailPath(pathname)) return;

    const path = normalizePath(pathname);
    const isHome = path === '';

    if (isHome && shopSeo) {
      applySeoBlockToDocument(shopSeo, { siteName: shopName });
      return;
    }

    const routeTitle = routePageTitle(pathname);
    const explicit = pageTitleRef.current;
    applyDocumentTitle(explicit != null ? explicit : routeTitle);
  }, [pathname, shopName, shopSeo, isResolving, applyDocumentTitle]);

  const value = useMemo(
    () => ({
      shopId,
      shopName: shopName || 'Yaadro',
      shopImage,
      shopSeo,
      bannerEnabled,
      bannerImages,
      isResolving,
      applyDocumentTitle,
      formatPageTitle: (pageTitle) => formatShopPageTitle(pageTitle, shopName || 'Yaadro'),
    }),
    [
      shopId,
      shopName,
      shopImage,
      shopSeo,
      bannerEnabled,
      bannerImages,
      isResolving,
      applyDocumentTitle,
    ]
  );

  return (
    <ShopBrandingContext.Provider value={value}>
      {children}
    </ShopBrandingContext.Provider>
  );
}

export function useShopBranding() {
  const ctx = useContext(ShopBrandingContext);
  if (!ctx) {
    throw new Error('useShopBranding must be used within ShopBrandingProvider');
  }
  return ctx;
}

/** Optional hook for pages outside PageTopBar — sets `Page | Shop Name` on mount. */
export function usePageTitle(pageTitle) {
  const { applyDocumentTitle, shopName, isResolving } = useShopBranding();
  useEffect(() => {
    if (isResolving && !shopName) return;
    applyDocumentTitle(pageTitle);
  }, [pageTitle, shopName, isResolving, applyDocumentTitle]);
}

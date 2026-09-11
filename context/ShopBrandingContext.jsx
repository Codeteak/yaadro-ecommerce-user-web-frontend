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
import { upsertLink } from '../utils/documentMeta';

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

  const applyShopBrandingAssets = useCallback((name, imageUrl) => {
    if (imageUrl) {
      upsertLink('icon', imageUrl);
      upsertLink('apple-touch-icon', imageUrl);
    }
  }, []);

  useLayoutEffect(() => {
    const cached = getCachedShopBranding();
    if (!cached?.shopId) return;
    setShopId(cached.shopId);
    setShopName(cached.shopName || 'Yaadro');
    setShopImage(cached.shopImage || null);
    setBannerEnabled(Boolean(cached.bannerEnabled));
    setBannerImages(Array.isArray(cached.bannerImages) ? cached.bannerImages : []);
    if (cached.seo) setShopSeo(cached.seo);
    applyShopBrandingAssets(cached.shopName, cached.shopImage);
    setIsResolving(false);
  }, [applyShopBrandingAssets]);

  useEffect(() => {
    if (resolveStartedRef.current) return;
    resolveStartedRef.current = true;

    (async () => {
      let result = null;
      try {
        result = await resolveShopBranding();
        setShopId(result.shopId || '');
        setShopName(result.shopName || 'Yaadro');
        setShopImage(result.shopImage || null);
        setBannerEnabled(Boolean(result.bannerEnabled));
        setBannerImages(Array.isArray(result.bannerImages) ? result.bannerImages : []);
        if (result.seo) setShopSeo(result.seo);
        applyShopBrandingAssets(result.shopName, result.shopImage);
      } finally {
        setIsResolving(false);
      }

      if (!result?.shopId) return;
      if (result.seo) return;
      const skipSeoFetch =
        typeof window !== 'undefined' &&
        shouldSkipLocalDevTenantFetch(window.location.hostname);
      if (skipSeoFetch) return;
      const fetched = await fetchShopSeoMetadata(result.shopId);
      if (fetched?.seo) setShopSeo(fetched.seo);
    })();
  }, [applyShopBrandingAssets]);

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

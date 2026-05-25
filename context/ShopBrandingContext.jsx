'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  formatShopPageTitle,
  resolveShopBranding,
} from '../utils/shopResolver';
import ShopSplashScreen from '../components/ShopSplashScreen';
import { upsertMeta, upsertLink } from '../utils/documentMeta';

const SPLASH_SESSION_KEY = 'yaadro_shop_splash_seen';
const MIN_SPLASH_MS = 1200;

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

const ShopBrandingContext = createContext(null);

export function ShopBrandingProvider({ children }) {
  const pathname = usePathname();
  const [shopId, setShopId] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopImage, setShopImage] = useState(null);
  const [isResolving, setIsResolving] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [splashVisible, setSplashVisible] = useState(false);
  const pageTitleRef = useRef(null);
  const resolveStartedRef = useRef(false);

  const applyDocumentTitle = useCallback(
    (pageTitle) => {
      pageTitleRef.current = pageTitle ?? null;
      const title = formatShopPageTitle(pageTitle, shopName);
      if (typeof document !== 'undefined') {
        document.title = title;
        upsertMeta('property', 'og:title', title);
      }
    },
    [shopName]
  );

  const applyShopMeta = useCallback((name, imageUrl) => {
    const displayName = name || 'Yaadro';
    upsertMeta('property', 'og:site_name', displayName);
    upsertMeta('property', 'og:type', 'website');
    if (imageUrl) {
      upsertMeta('property', 'og:image', imageUrl);
      upsertMeta('name', 'twitter:image', imageUrl);
      upsertLink('icon', imageUrl);
      upsertLink('apple-touch-icon', imageUrl);
    }
  }, []);

  useEffect(() => {
    if (resolveStartedRef.current) return;
    resolveStartedRef.current = true;

    const splashAlreadySeen =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(SPLASH_SESSION_KEY) === '1';

    if (!splashAlreadySeen) {
      setShowSplash(true);
      setSplashVisible(true);
    }

    const startedAt = Date.now();

    (async () => {
      try {
        const result = await resolveShopBranding();
        setShopId(result.shopId || '');
        setShopName(result.shopName || 'Yaadro');
        setShopImage(result.shopImage || null);
        applyShopMeta(result.shopName, result.shopImage);
      } finally {
        setIsResolving(false);
        const elapsed = Date.now() - startedAt;
        const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
        window.setTimeout(() => {
          setSplashVisible(false);
          window.setTimeout(() => {
            setShowSplash(false);
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
            }
          }, 320);
        }, wait);
      }
    })();
  }, [applyShopMeta]);

  useEffect(() => {
    if (!shopName || isResolving) return;
    const routeTitle = routePageTitle(pathname);
    const explicit = pageTitleRef.current;
    applyDocumentTitle(explicit != null ? explicit : routeTitle);
  }, [pathname, shopName, isResolving, applyDocumentTitle]);

  const value = useMemo(
    () => ({
      shopId,
      shopName: shopName || 'Yaadro',
      shopImage,
      isResolving,
      applyDocumentTitle,
      formatPageTitle: (pageTitle) => formatShopPageTitle(pageTitle, shopName || 'Yaadro'),
    }),
    [shopId, shopName, shopImage, isResolving, applyDocumentTitle]
  );

  return (
    <ShopBrandingContext.Provider value={value}>
      {showSplash && (
        <ShopSplashScreen
          visible={splashVisible}
          shopName={shopName || 'Yaadro'}
          shopImage={shopImage}
          isLoading={isResolving && !shopName}
        />
      )}
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

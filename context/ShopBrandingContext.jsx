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
import { upsertMeta, upsertLink } from '../utils/documentMeta';

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

    (async () => {
      try {
        const result = await resolveShopBranding();
        setShopId(result.shopId || '');
        setShopName(result.shopName || 'Yaadro');
        setShopImage(result.shopImage || null);
        applyShopMeta(result.shopName, result.shopImage);
      } finally {
        setIsResolving(false);
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

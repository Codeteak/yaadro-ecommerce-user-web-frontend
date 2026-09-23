'use client';

import { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useAlert } from './AlertContext';
import { useToast } from './ToastContext';
import { useCartQuery } from '../hooks/useCart';
import {
  applyGuestCartBundleQuantities,
  cartHasBxgyOffer,
  expandCartItemsWithBundleRewards,
  formatCartCouponPreviewMessage,
  getBundleFreeExtraOnPaidLine,
  getCartLinePaidQty,
  isBundleRewardCartLine,
  isTrustedCartCouponPreview,
  mergePreviewPricingOntoLocalLines,
  normalizeCartLineCatalogPricing,
  stripPaidCartLinesOnly,
  sumCartPaidUnits,
} from '../utils/cartPromotions';
import { findProductNameForNewFreeUnits } from '../utils/offerDisplay';
import {
  addOrMergeCartLine,
  buildPersistableCartLineFromProduct,
  persistCartLinesImmediate,
  sortCartItemsForDisplay,
} from '../utils/cartLinePersist';
import { isSoldByWeightProduct } from '../utils/productSizeSelection';
import {
  readSelectedCouponCode,
  readSelectedCouponCodes,
  writeSelectedCouponCodes,
} from '../utils/checkoutSession';
import {
  RESOLVED_SHOP_HOST_STORAGE_KEY,
  RESOLVED_SHOP_ID_STORAGE_KEY,
  shouldUseEnvShopFallback,
} from '../utils/shopResolver';

function buildGuestDisplayCartItems(localLines) {
  const withBundle = applyGuestCartBundleQuantities(stripPaidCartLinesOnly(localLines));
  return sortCartItemsForDisplay(
    expandCartItemsWithBundleRewards(withBundle).map(normalizeCartLineCatalogPricing),
  );
}

const CartContext = createContext();
const GUEST_CART_STORAGE_KEY = 'cart';
const API_CART_CACHE_STORAGE_KEY = 'cartApiCache';

function resolveShopIdForCartStorage() {
  if (typeof window !== 'undefined') {
    try {
      const host = String(window.location.hostname || '')
        .toLowerCase()
        .trim();
      const cachedHost =
        window.localStorage.getItem(RESOLVED_SHOP_HOST_STORAGE_KEY) || '';
      const resolved = window.localStorage.getItem(RESOLVED_SHOP_ID_STORAGE_KEY);
      if (
        resolved &&
        String(resolved).trim() &&
        cachedHost &&
        cachedHost === host
      ) {
        return String(resolved).trim();
      }
    } catch {
      // ignore storage errors
    }
  }
  if (typeof window !== 'undefined') {
    const host = String(window.location.hostname || '')
      .toLowerCase()
      .trim();
    if (!shouldUseEnvShopFallback(host)) return '';
  } else if (process.env.NODE_ENV === 'production') {
    return '';
  }
  const envShopId =
    typeof process.env.NEXT_PUBLIC_SHOP_ID === 'string'
      ? process.env.NEXT_PUBLIC_SHOP_ID.trim()
      : '';
  return envShopId || '';
}

function shopCartStorageKey() {
  const shopId = resolveShopIdForCartStorage();
  return shopId ? `yaadro_cart_${shopId}` : GUEST_CART_STORAGE_KEY;
}

/** Keys to try when hydrating — shop-scoped only when shop is known (no cross-shop poison). */
function cartStorageFallbackKeys() {
  const shopId = resolveShopIdForCartStorage();
  if (shopId) {
    const keys = [`yaadro_cart_${shopId}`];
    if (typeof window !== 'undefined') {
      const host = String(window.location.hostname || '')
        .toLowerCase()
        .trim();
      if (shouldUseEnvShopFallback(host)) {
        const envShopId =
          typeof process.env.NEXT_PUBLIC_SHOP_ID === 'string'
            ? process.env.NEXT_PUBLIC_SHOP_ID.trim()
            : '';
        if (envShopId && envShopId !== shopId) {
          keys.push(`yaadro_cart_${envShopId}`);
        }
      }
    }
    return keys;
  }
  // No shop yet — only anonymous guest keys (never write these into a shop key later as primary source).
  return [GUEST_CART_STORAGE_KEY];
}

function readPaidCartLinesFromStorage() {
  if (typeof window === 'undefined') return [];
  for (const key of cartStorageFallbackKeys()) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      return parsed.filter((it) => !isBundleRewardCartLine(it));
    } catch {
      // try next key
    }
  }
  return [];
}

export function CartProvider({ children }) {
  const [isClient, setIsClient] = useState(false);
  /** False until useLayoutEffect has read localStorage — avoids empty-cart flash on first paint. */
  const [hasHydratedLocalCart, setHasHydratedLocalCart] = useState(false);
  const showSidebarCart = useUiStore((s) => s.cartSidebarOpen);
  const setShowSidebarCart = useUiStore((s) => s.setCartSidebarOpen);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [savedCarts, setSavedCarts] = useState([]);
  const [cartTemplates, setCartTemplates] = useState([]);
  const [selectedCouponCode, setSelectedCouponCodeState] = useState('');
  const [selectedCouponCodes, setSelectedCouponCodesState] = useState([]);
  const selectedCouponCodeRef = useRef('');

  const { showAlert } = useAlert();
  const { showToast } = useToast();

  const [localCartItems, setLocalCartItems] = useState([]);
  const localCartItemsRef = useRef([]);
  useEffect(() => {
    localCartItemsRef.current = localCartItems;
  }, [localCartItems]);

  useEffect(() => {
    selectedCouponCodeRef.current = selectedCouponCode;
  }, [selectedCouponCode]);

  const setSelectedCouponCodes = useCallback((codes) => {
    const list = Array.isArray(codes)
      ? [...new Set(codes.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean))]
      : [];
    setSelectedCouponCodesState(list);
    const primary = list[0] || '';
    selectedCouponCodeRef.current = primary;
    setSelectedCouponCodeState(primary);
    writeSelectedCouponCodes(list);
  }, []);

  const setSelectedCouponCode = useCallback((code) => {
    const next = String(code || '').trim().toUpperCase();
    setSelectedCouponCodes(next ? [next] : []);
  }, [setSelectedCouponCodes]);

  useLayoutEffect(() => {
    setIsClient(true);

    if (typeof window === 'undefined') return;

    const paidOnly = readPaidCartLinesFromStorage();
    const next = applyGuestCartBundleQuantities(paidOnly);
    setLocalCartItems(next);
    localCartItemsRef.current = next;
    persistCartLinesImmediate(next, shopCartStorageKey());

    const lastActivity = localStorage.getItem('cartLastActivity');
    if (lastActivity) {
      setLastActivityTime(parseInt(lastActivity, 10));
    }

    const savedCartsData = localStorage.getItem('savedCarts');
    if (savedCartsData) {
      try {
        setSavedCarts(JSON.parse(savedCartsData));
      } catch (error) {
        console.error('Error parsing saved carts:', error);
      }
    }

    const templatesData = localStorage.getItem('cartTemplates');
    if (templatesData) {
      try {
        setCartTemplates(JSON.parse(templatesData));
      } catch (error) {
        console.error('Error parsing cart templates:', error);
      }
    }

    setHasHydratedLocalCart(true);
    const savedCodes = readSelectedCouponCodes();
    if (savedCodes.length) {
      setSelectedCouponCodesState(savedCodes);
      selectedCouponCodeRef.current = savedCodes[0];
      setSelectedCouponCodeState(savedCodes[0]);
    } else {
      const savedCoupon = readSelectedCouponCode();
      if (savedCoupon) {
        selectedCouponCodeRef.current = savedCoupon;
        setSelectedCouponCodeState(savedCoupon);
        setSelectedCouponCodesState([savedCoupon]);
      }
    }
  }, []);

  // After shop id resolves, migrate anonymous `cart` → `yaadro_cart_${shopId}` once
  // so a cold load does not wipe items added before domain resolve finished.
  useEffect(() => {
    if (!hasHydratedLocalCart || typeof window === 'undefined') return undefined;
    let cancelled = false;

    const migrateGuestCartToShopKey = () => {
      if (cancelled) return;
      const shopId = resolveShopIdForCartStorage();
      if (!shopId) return;
      const shopKey = `yaadro_cart_${shopId}`;
      let guestRaw = null;
      let shopRaw = null;
      try {
        guestRaw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        shopRaw = localStorage.getItem(shopKey);
      } catch {
        return;
      }
      const shopEmpty =
        !shopRaw || shopRaw === '[]' || shopRaw === 'null' || shopRaw === '';
      const memory = localCartItemsRef.current;
      if (Array.isArray(memory) && memory.length > 0) {
        persistCartLinesImmediate(memory, shopKey);
        try {
          if (guestRaw) localStorage.removeItem(GUEST_CART_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      if (!guestRaw || guestRaw === '[]' || !shopEmpty) return;
      try {
        const parsed = JSON.parse(guestRaw);
        if (!Array.isArray(parsed) || parsed.length === 0) return;
        localStorage.setItem(shopKey, guestRaw);
        localStorage.removeItem(GUEST_CART_STORAGE_KEY);
        const paidOnly = stripPaidCartLinesOnly(parsed);
        const next = applyGuestCartBundleQuantities(paidOnly);
        setLocalCartItems(next);
        localCartItemsRef.current = next;
      } catch {
        /* ignore corrupt guest cart */
      }
    };

    migrateGuestCartToShopKey();

    (async () => {
      try {
        const { resolveShopId } = await import('../utils/authApi');
        await resolveShopId();
      } catch {
        /* ignore */
      }
      migrateGuestCartToShopKey();
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydratedLocalCart]);

  const paidLocalCount = stripPaidCartLinesOnly(localCartItems).length;
  const {
    data: cartPreviewData,
    isFetching: cartQueryFetching,
  } = useCartQuery({
    // Guest-safe: POST /storefront/cart/preview does not require JWT.
    // Always preview when the cart has paid lines so offer/pricing merge works with or without coupons.
    enabled: paidLocalCount > 0,
    couponCode: cartHasBxgyOffer(localCartItems)
      ? undefined
      : selectedCouponCode || undefined,
    couponCodes:
      cartHasBxgyOffer(localCartItems) || selectedCouponCodes.length <= 1
        ? undefined
        : selectedCouponCodes,
    items: localCartItems,
  });

  /** Server preview has priced lines for the current local cart (with or without coupon). */
  const cartPreviewTrusted = isTrustedCartCouponPreview(cartPreviewData, localCartItems);
  /** @deprecated alias — same as cartPreviewTrusted; kept for checkout coupon UI */
  const couponPreviewTrusted = cartPreviewTrusted;

  const previewHasBundle = Boolean(
    cartPreviewData?.promotions?.auto?.hasBundle ||
      cartPreviewData?.promotions?.hasBundle ||
      (Array.isArray(cartPreviewData?.promotions?.types) &&
        cartPreviewData.promotions.types.includes('bundle'))
  );

  const bxgyBlocksCoupons = useMemo(
    () => cartHasBxgyOffer(localCartItems) || previewHasBundle,
    [localCartItems, previewHasBundle]
  );

  const cartItems = useMemo(() => {
    const base = buildGuestDisplayCartItems(localCartItems);
    // Keep catalog / SKU line prices from preview. Do NOT paint cart-level
    // auto/coupon discounts onto unit prices — that invents fake ₹2.22 "sale"
    // prices (e.g. 99.5% cart off shown as product SAVE ₹438). Bill summary
    // already shows auto_cart / coupon as separate rows.
    if (cartPreviewTrusted && cartPreviewData?.items?.length) {
      return mergePreviewPricingOntoLocalLines(base, cartPreviewData.items, {
        ignoreCouponPricing: bxgyBlocksCoupons,
      });
    }
    return base;
  }, [
    localCartItems,
    cartPreviewTrusted,
    cartPreviewData?.items,
    bxgyBlocksCoupons,
  ]);

  const cartDataForUi = useMemo(() => {
    if (!cartPreviewTrusted || !cartPreviewData) return undefined;
    if (!bxgyBlocksCoupons) return cartPreviewData;
    const itemsSum = stripPaidCartLinesOnly(cartItems).reduce((sum, it) => {
      const line = Number(it.lineTotal);
      if (Number.isFinite(line) && line >= 0) return sum + line;
      const unit = Number(it.price) || 0;
      return sum + unit * getCartLinePaidQty(it);
    }, 0);
    // Strip coupon ledger so checkout totals never show coupon savings on BXGY carts.
    return {
      ...cartPreviewData,
      total: itemsSum,
      couponDiscountMinor: 0,
      promotions: cartPreviewData.promotions
        ? {
            ...cartPreviewData.promotions,
            hasCoupon: false,
            coupon: {
              ...(cartPreviewData.promotions.coupon || {}),
              status: 'none',
              code: null,
              discountMinor: 0,
            },
            couponCodes: [],
            suggestedCoupons: [],
          }
        : cartPreviewData.promotions,
    };
  }, [cartPreviewTrusted, cartPreviewData, bxgyBlocksCoupons, cartItems]);

  useEffect(() => {
    if (!bxgyBlocksCoupons) return;
    if (!selectedCouponCode && selectedCouponCodes.length === 0) return;
    setSelectedCouponCode('');
  }, [
    bxgyBlocksCoupons,
    selectedCouponCode,
    selectedCouponCodes.length,
    setSelectedCouponCode,
  ]);

  useEffect(() => {
    if (!cartPreviewTrusted || cartQueryFetching || !selectedCouponCode || bxgyBlocksCoupons) {
      return;
    }
    const preview = cartPreviewData?.promotions?.coupon;
    if (preview?.status !== 'not_applicable') return;
    const previewCode = String(preview.code || '').toUpperCase();
    if (previewCode && previewCode !== selectedCouponCode) return;
    setSelectedCouponCode('');
    showAlert(
      formatCartCouponPreviewMessage(preview) ||
        'This coupon cannot be applied to your cart.',
      'Coupon',
      'warning'
    );
  }, [
    cartPreviewTrusted,
    cartQueryFetching,
    cartPreviewData?.promotions?.coupon,
    selectedCouponCode,
    setSelectedCouponCode,
    showAlert,
    bxgyBlocksCoupons,
  ]);

  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      const paidOnly = localCartItems.filter((it) => !isBundleRewardCartLine(it));
      persistCartLinesImmediate(paidOnly, shopCartStorageKey());
      setLastActivityTime(Date.now());
    }
  }, [localCartItems, isClient]);

  useEffect(() => {
    if (!isClient || typeof window === 'undefined' || localCartItems.length === 0) return;
    const checkExpiration = () => {
      const daysSinceActivity = (Date.now() - lastActivityTime) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 30) {
        setLocalCartItems([]);
        localStorage.removeItem(shopCartStorageKey());
        localStorage.removeItem(GUEST_CART_STORAGE_KEY);
        localStorage.removeItem(API_CART_CACHE_STORAGE_KEY);
        localStorage.removeItem('cartLastActivity');
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isClient, lastActivityTime, localCartItems.length]);

  const addToCart = async (product, quantity = 1) => {
    const soldByWeight = isSoldByWeightProduct(product);
    const rawQty = Number(quantity);
    const addQty = soldByWeight
      ? Math.max(0.0001, Math.round((Number.isFinite(rawQty) ? rawQty : 0) * 10000) / 10000)
      : Math.max(1, Math.trunc(Number.isFinite(rawQty) ? rawQty : 1) || 1);
    if (!(addQty > 0)) {
      showAlert('Could not add this product to the cart.', 'Error', 'error');
      return;
    }
    const persistableRaw = buildPersistableCartLineFromProduct(product);
    if (!persistableRaw) {
      showAlert('Could not add this product to the cart.', 'Error', 'error');
      return;
    }
    const persistable = normalizeCartLineCatalogPricing(persistableRaw);

    const prevExpanded = buildGuestDisplayCartItems(localCartItemsRef.current);
    const merged = addOrMergeCartLine(localCartItemsRef.current, persistable, addQty);
    const nextItems = applyGuestCartBundleQuantities(merged);
    setLocalCartItems(nextItems);
    localCartItemsRef.current = nextItems;
    if (isClient && typeof window !== 'undefined') {
      persistCartLinesImmediate(nextItems, shopCartStorageKey());
    }
    setLastActivityTime(Date.now());

    const nextExpanded = buildGuestDisplayCartItems(nextItems);
    const freeName = findProductNameForNewFreeUnits(prevExpanded, nextExpanded);
    if (freeName) {
      showToast(`Nice! We added your free ${freeName} to the cart.`, 'success');
    }
  };

  const lineMatchesKey = (row, key) =>
    row.cartItemKey === key || row.id === key || row.cartItemId === key;

  const removeFromCart = (idOrKey) => {
    const item = cartItems.find(
      (row) =>
        row.cartItemKey === idOrKey || row.id === idOrKey || row.cartItemId === idOrKey
    );
    if (!item) return;
    if (item.isBundleReward) return;

    const freeExtra = getBundleFreeExtraOnPaidLine(item);
    const nextItems = applyGuestCartBundleQuantities(
      localCartItemsRef.current.filter(
        (row) =>
          !isBundleRewardCartLine(row) &&
          row.cartItemKey !== idOrKey &&
          row.id !== idOrKey &&
          row.cartItemId !== idOrKey
      )
    );
    localCartItemsRef.current = nextItems;
    setLocalCartItems(nextItems);
    if (isClient && typeof window !== 'undefined') {
      persistCartLinesImmediate(nextItems, shopCartStorageKey());
    }
    if (freeExtra > 0) {
      showToast('Free offer items for this product were removed.', 'info');
    }
  };

  const updateQuantity = (idOrKey, quantity) => {
    const item = cartItems.find(
      (row) => !isBundleRewardCartLine(row) && lineMatchesKey(row, idOrKey)
    );
    if (!item) return;

    const soldByWeight = isSoldByWeightProduct(item);
    const raw = Number(quantity);
    const nextQty = soldByWeight
      ? Math.round((Number.isFinite(raw) ? raw : 0) * 10000) / 10000
      : Math.trunc(Number.isFinite(raw) ? raw : 0) || 0;

    if (!(nextQty > 0)) {
      removeFromCart(idOrKey);
      return;
    }

    const prevPaidQty = getCartLinePaidQty(item);
    const prevExpanded = buildGuestDisplayCartItems(localCartItemsRef.current);
    const updated = localCartItemsRef.current
      .filter((row) => !isBundleRewardCartLine(row))
      .map((row) => (lineMatchesKey(row, idOrKey) ? { ...row, quantity: nextQty } : row));
    const nextItems = applyGuestCartBundleQuantities(updated);
    setLocalCartItems(nextItems);
    localCartItemsRef.current = nextItems;
    setLastActivityTime(Date.now());

    if (nextQty > prevPaidQty) {
      const nextExpanded = buildGuestDisplayCartItems(nextItems);
      const freeName = findProductNameForNewFreeUnits(prevExpanded, nextExpanded);
      if (freeName) {
        showToast(`Nice! We added your free ${freeName} to the cart.`, 'success');
      }
    }
  };

  const updateCartItemNote = (idOrKey, note) => {
    setLocalCartItems((prevItems) =>
      prevItems.map((item) =>
        item.cartItemKey === idOrKey || item.id === idOrKey ? { ...item, note } : item
      )
    );
    setLastActivityTime(Date.now());
  };

  const clearCart = async () => {
    setLocalCartItems([]);
    localCartItemsRef.current = [];
    selectedCouponCodeRef.current = '';
    setSelectedCouponCodeState('');
    setSelectedCouponCodesState([]);
    writeSelectedCouponCodes([]);
    if (isClient && typeof window !== 'undefined') {
      localStorage.removeItem(shopCartStorageKey());
      localStorage.removeItem(API_CART_CACHE_STORAGE_KEY);
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      localStorage.removeItem('cartLastActivity');
      persistCartLinesImmediate([], shopCartStorageKey());
    }
  };

  const saveCart = (name) => {
    const newSavedCart = {
      id: Date.now(),
      name,
      items: [...cartItems],
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedCarts, newSavedCart];
    setSavedCarts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedCarts', JSON.stringify(updated));
    }
    return newSavedCart.id;
  };

  const loadSavedCart = (cartId) => {
    const savedCart = savedCarts.find((c) => c.id === cartId);
    if (savedCart) {
      setLocalCartItems(savedCart.items);
      setLastActivityTime(Date.now());
      if (typeof window !== 'undefined') {
        localStorage.setItem('cartLastActivity', Date.now().toString());
      }
    }
  };

  // Delete a saved cart
  const deleteSavedCart = (cartId) => {
    const updated = savedCarts.filter(c => c.id !== cartId);
    setSavedCarts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedCarts', JSON.stringify(updated));
    }
  };

  // Save current cart as a template
  const saveCartAsTemplate = (name) => {
    const newTemplate = {
      id: Date.now(),
      name,
      items: [...cartItems],
      createdAt: new Date().toISOString(),
    };
    const updated = [...cartTemplates, newTemplate];
    setCartTemplates(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cartTemplates', JSON.stringify(updated));
    }
    return newTemplate.id;
  };

  // Load a cart template (adds items to current cart)
  const loadCartTemplate = (templateId) => {
    const template = cartTemplates.find(t => t.id === templateId);
    if (template) {
      template.items.forEach(item => {
        addToCart(item, item.quantity || 1);
      });
    }
  };

  // Delete a cart template
  const deleteCartTemplate = (templateId) => {
    const updated = cartTemplates.filter(t => t.id !== templateId);
    setCartTemplates(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cartTemplates', JSON.stringify(updated));
    }
  };

  // Share cart (generate shareable link)
  const shareCart = () => {
    const cartData = {
      items: cartItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
      })),
      timestamp: Date.now(),
    };
    const encoded = btoa(JSON.stringify(cartData));
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cart?shared=${encoded}`;
    
    if (typeof window !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'My Shopping Cart',
        text: 'Check out my shopping cart!',
        url: shareUrl,
      }).catch(() => {
        // Fallback to copy to clipboard
        navigator.clipboard.writeText(shareUrl);
        showToast('Cart link copied to clipboard');
      });
    } else if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast('Cart link copied to clipboard');
    }
    
    return shareUrl;
  };

  // Load shared cart
  const loadSharedCart = (sharedData) => {
    try {
      const decoded = JSON.parse(atob(sharedData));
      // Note: In production, you'd fetch full product data from backend
      // For now, we'll just show a message
      if (decoded.items && decoded.items.length > 0) {
        // Note: In production, you'd use a confirmation modal instead of window.confirm
        // For now, we'll show an info message
        showAlert(`Shared cart detected with ${decoded.items.length} items. (Note: Full implementation requires backend to fetch product details)`, 'Shared Cart', 'info');
      }
    } catch (error) {
      console.error('Error loading shared cart:', error);
    }
  };

  const cartCount = cartItems.length === 0 ? 0 : sumCartPaidUnits(cartItems);

  const localLinesTotal =
    cartItems.length === 0
      ? 0
      : cartItems.reduce((total, item) => {
          if (item.isBundleReward) return total;
          const line = Number(item.lineTotal);
          if (Number.isFinite(line) && line >= 0) return total + line;
          return total + (Number(item.price) || 0) * (Number(item.quantity) || 0);
        }, 0);

  // Prefer UI cart total (BXGY strips coupon) when we have a trusted preview.
  const cartTotal =
    cartDataForUi?.total != null && Number.isFinite(Number(cartDataForUi.total))
      ? Number(cartDataForUi.total)
      : cartPreviewTrusted &&
          cartPreviewData?.total != null &&
          Number.isFinite(Number(cartPreviewData.total)) &&
          !bxgyBlocksCoupons
        ? Number(cartPreviewData.total)
        : localLinesTotal;

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateCartItemNote,
    clearCart,
    cartCount,
    cartTotal,
    showSidebarCart,
    setShowSidebarCart,
    saveCart,
    loadSavedCart,
    deleteSavedCart,
    savedCarts,
    saveCartAsTemplate,
    loadCartTemplate,
    deleteCartTemplate,
    cartTemplates,
    shareCart,
    loadSharedCart,
    lastActivityTime,
    loading: false,
    cartQueryFetching,
    hasHydratedLocalCart,
    selectedCouponCode,
    setSelectedCouponCode,
    bxgyBlocksCoupons,
    selectedCouponCodes,
    setSelectedCouponCodes,
    cartData: cartDataForUi,
    couponPreviewTrusted,
    cartPreviewTrusted,
    /** Always true — cart UI reads from localStorage (layout) + query merge; no full-page cart gate. */
    isCartReady: true,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}


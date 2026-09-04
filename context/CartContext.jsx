'use client';

import { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useAlert } from './AlertContext';
import { useToast } from './ToastContext';
import {
  applyGuestCartBundleQuantities,
  expandCartItemsWithBundleRewards,
  isBundleRewardCartLine,
  stripPaidCartLinesOnly,
  sumCartDisplayUnits,
} from '../utils/cartPromotions';
import {
  addOrMergeCartLine,
  buildPersistableCartLineFromProduct,
  persistCartLinesImmediate,
  sortCartItemsForDisplay,
} from '../utils/cartLinePersist';
import {
  readSelectedCouponCode,
  writeSelectedCouponCode,
} from '../utils/checkoutSession';

function buildGuestDisplayCartItems(localLines) {
  const withBundle = applyGuestCartBundleQuantities(stripPaidCartLinesOnly(localLines));
  return sortCartItemsForDisplay(expandCartItemsWithBundleRewards(withBundle));
}

const CartContext = createContext();
const GUEST_CART_STORAGE_KEY = 'cart';
const API_CART_CACHE_STORAGE_KEY = 'cartApiCache';

function shopCartStorageKey() {
  const shopId =
    typeof process.env.NEXT_PUBLIC_SHOP_ID === 'string'
      ? process.env.NEXT_PUBLIC_SHOP_ID.trim()
      : '';
  return shopId ? `yaadro_cart_${shopId}` : GUEST_CART_STORAGE_KEY;
}

function readPaidCartLinesFromStorage() {
  if (typeof window === 'undefined') return [];
  const primary = shopCartStorageKey();
  for (const key of [primary, GUEST_CART_STORAGE_KEY, API_CART_CACHE_STORAGE_KEY]) {
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

  const setSelectedCouponCode = (code) => {
    const next = String(code || '').trim().toUpperCase();
    selectedCouponCodeRef.current = next;
    setSelectedCouponCodeState(next);
    writeSelectedCouponCode(next);
  };

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
    const savedCoupon = readSelectedCouponCode();
    if (savedCoupon) {
      selectedCouponCodeRef.current = savedCoupon;
      setSelectedCouponCodeState(savedCoupon);
    }
  }, []);

  const cartItems = useMemo(
    () => buildGuestDisplayCartItems(localCartItems),
    [localCartItems]
  );

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
    const addQty = Math.max(1, Number(quantity) || 1);
    const persistable = buildPersistableCartLineFromProduct(product);
    if (!persistable) {
      showAlert('Could not add this product to the cart.', 'Error', 'error');
      return;
    }

    const merged = addOrMergeCartLine(localCartItemsRef.current, persistable, addQty);
    const nextItems = applyGuestCartBundleQuantities(merged);
    setLocalCartItems(nextItems);
    localCartItemsRef.current = nextItems;
    if (isClient && typeof window !== 'undefined') {
      persistCartLinesImmediate(nextItems, shopCartStorageKey());
    }
    setLastActivityTime(Date.now());
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

    setLocalCartItems((prevItems) =>
      applyGuestCartBundleQuantities(
        prevItems.filter(
          (row) =>
            !isBundleRewardCartLine(row) &&
            row.cartItemKey !== idOrKey &&
            row.id !== idOrKey &&
            row.cartItemId !== idOrKey
        )
      )
    );
  };

  const updateQuantity = (idOrKey, quantity) => {
    if (quantity <= 0) {
      removeFromCart(idOrKey);
      return;
    }

    const item = cartItems.find(
      (row) => !isBundleRewardCartLine(row) && lineMatchesKey(row, idOrKey)
    );
    if (!item) return;

    setLocalCartItems((prevItems) => {
      const updated = prevItems
        .filter((row) => !isBundleRewardCartLine(row))
        .map((row) => (lineMatchesKey(row, idOrKey) ? { ...row, quantity } : row));
      return applyGuestCartBundleQuantities(updated);
    });
    setLastActivityTime(Date.now());
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
    writeSelectedCouponCode('');
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

  const cartCount = cartItems.length === 0 ? 0 : sumCartDisplayUnits(cartItems);

  const cartTotal =
    cartItems.length === 0
      ? 0
      : cartItems.reduce((total, item) => {
          if (item.isBundleReward) return total;
          const line = Number(item.lineTotal);
          if (Number.isFinite(line) && line >= 0) return total + line;
          return total + (Number(item.price) || 0) * (Number(item.quantity) || 0);
        }, 0);

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
    cartQueryFetching: false,
    hasHydratedLocalCart,
    selectedCouponCode,
    setSelectedCouponCode,
    cartData: undefined,
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


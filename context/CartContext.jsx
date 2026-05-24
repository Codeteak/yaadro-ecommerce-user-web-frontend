'use client';

import { createContext, useContext, useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { useCartQuery, useAddToCart, useUpdateCartItem, useRemoveFromCart, useClearCart, cartKeys, EMPTY_CART_QUERY } from '../hooks/useCart';
import {
  applyGuestCartBundleQuantities,
  expandCartItemsWithBundleRewards,
  getCartLinePaidQty,
  isBundleRewardCartLine,
  bundleRewardMatchesParent,
  stripPaidCartLinesOnly,
  sumCartDisplayUnits,
} from '../utils/cartPromotions';
import {
  addOrMergeCartLine,
  applyAddRollback,
  buildAddRollbackTarget,
  buildPersistableCartLineFromProduct,
  cartLinesMatch,
  mergeServerCartWithLocalLines,
  persistCartLinesImmediate,
  sortCartItemsForDisplay,
  syncPaidCartCacheLines,
} from '../utils/cartLinePersist';

function buildDisplayCartItems(serverLines, localLines) {
  const merged =
    Array.isArray(serverLines) && serverLines.length > 0
      ? mergeServerCartWithLocalLines(serverLines, localLines)
      : localLines;
  return sortCartItemsForDisplay(expandCartItemsWithBundleRewards(merged));
}

function buildGuestDisplayCartItems(localLines) {
  const withBundle = applyGuestCartBundleQuantities(stripPaidCartLinesOnly(localLines));
  return sortCartItemsForDisplay(expandCartItemsWithBundleRewards(withBundle));
}

const CartContext = createContext();
const GUEST_CART_STORAGE_KEY = 'cart';
const API_CART_CACHE_STORAGE_KEY = 'cartApiCache';

export function CartProvider({ children }) {
  // Initialize cart state from localStorage if available (client-side only)
  const [isClient, setIsClient] = useState(false);
  /** False until useLayoutEffect has read `cart` / `cartApiCache` — avoids empty-cart flash on first paint. */
  const [hasHydratedLocalCart, setHasHydratedLocalCart] = useState(false);
  const [showSidebarCart, setShowSidebarCart] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [savedCarts, setSavedCarts] = useState([]);
  const [cartTemplates, setCartTemplates] = useState([]);
  
  // Get auth context (now CartProvider is inside AuthProvider in layout)
  const { isAuthenticated, token } = useAuth();
  const { showAlert } = useAlert();

  // Use API cart when authenticated; otherwise use local cart.
  const useApiCart = !!(isAuthenticated && token);
  const syncedLocalToApiRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);

  // Load cart using TanStack Query (disabled for now)
  const {
    data: cartData,
    isLoading: loading,
    isFetching: cartQueryFetching,
  } = useCartQuery({ enabled: useApiCart });
  const apiCartItems = useApiCart ? (cartData?.items || []) : [];

  /**
   * Lines removed optimistically can briefly reappear when TanStack refetches and the
   * server/cache still lists the old row — `mergeServerCartWithLocalLines` is server-driven.
   * We hide these ids until the refetch settles (see remove mutation onSuccess timeout).
   */
  const [pendingRemovedCartItemIds, setPendingRemovedCartItemIds] = useState([]);

  useEffect(() => {
    if (!useApiCart) setPendingRemovedCartItemIds([]);
  }, [useApiCart]);

  const apiCartItemsForMerge = useMemo(() => {
    if (!pendingRemovedCartItemIds.length) return apiCartItems;
    const drop = new Set(pendingRemovedCartItemIds.map(String));
    return apiCartItems.filter((it) => !drop.has(String(it.cartItemId ?? it.id)));
  }, [apiCartItems, pendingRemovedCartItemIds]);

  const queryClient = useQueryClient();
  const addToCartMutation = useAddToCart();
  const updateCartItemMutation = useUpdateCartItem();
  const removeFromCartMutation = useRemoveFromCart();
  const clearCartMutation = useClearCart();

  const cartMutating =
    addToCartMutation.isPending ||
    updateCartItemMutation.isPending ||
    removeFromCartMutation.isPending ||
    clearCartMutation.isPending;

  // Local cart state for unauthenticated users
  const [localCartItems, setLocalCartItems] = useState([]);
  const localCartItemsRef = useRef([]);
  useEffect(() => {
    localCartItemsRef.current = localCartItems;
  }, [localCartItems]);

  // Hydrate cart + saved carts from localStorage before paint (avoids full-page cart loaders).
  // For signed-in users, never apply an *empty* `cartApiCache` — token refresh / auth re-hydration
  // re-runs this effect; writing `[]` here would wipe client snapshot lines while GET /cart refetches.
  // Guest carts still apply `[]` so a cleared cart stays cleared after reload.
  useLayoutEffect(() => {
    setIsClient(true);

    if (typeof window === 'undefined') return;

    const useApiStorage = !!(isAuthenticated && token);
    const storageKey = useApiStorage ? API_CART_CACHE_STORAGE_KEY : GUEST_CART_STORAGE_KEY;
    const savedCart = localStorage.getItem(storageKey);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const paidOnly = Array.isArray(parsed)
          ? parsed.filter((it) => !isBundleRewardCartLine(it))
          : [];
        if (useApiStorage) {
          if (paidOnly.length > 0) {
            setLocalCartItems(applyGuestCartBundleQuantities(paidOnly));
          }
        } else {
          setLocalCartItems(applyGuestCartBundleQuantities(paidOnly));
        }
        const lastActivity = localStorage.getItem('cartLastActivity');
        if (lastActivity) {
          setLastActivityTime(parseInt(lastActivity, 10));
        }
      } catch (error) {
        console.error('Error parsing cart from localStorage:', error);
      }
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
  }, [isAuthenticated, token]);

  // Merged view: API truth + optimistic pending lines + client-persisted image snapshots.
  const cartItems = useMemo(() => {
    if (!useApiCart) return buildGuestDisplayCartItems(localCartItems);

    const server = apiCartItemsForMerge;
    if (server.length > 0) {
      return buildDisplayCartItems(server, localCartItems);
    }

    // Server cart is empty — do not show stale `cartApiCache` lines after checkout/clear.
    if (cartMutating && localCartItems.length > 0) {
      return buildGuestDisplayCartItems(localCartItems);
    }
    if (cartData !== undefined && !loading) {
      return [];
    }

    // First paint before GET /cart resolves: show hydrated local snapshot.
    return buildGuestDisplayCartItems(localCartItems);
  }, [
    useApiCart,
    apiCartItemsForMerge,
    localCartItems,
    cartMutating,
    cartData,
    loading,
  ]);

  // Keep local cache aligned with server while preserving snapshot URLs from the client.
  // Skip while refetching with an empty payload — avoids wiping optimistic lines after
  // returning from /add/address or other brief navigations away from checkout.
  useEffect(() => {
    if (!useApiCart) return;
    if (loading && cartData === undefined) return;
    if (
      cartQueryFetching &&
      apiCartItems.length === 0 &&
      localCartItems.length > 0
    ) {
      return;
    }
    if (!apiCartItemsForMerge.length) {
      if (
        localCartItems.length > 0 &&
        !cartMutating &&
        cartData !== undefined &&
        !loading
      ) {
        setLocalCartItems([]);
        localCartItemsRef.current = [];
        if (isClient && typeof window !== 'undefined') {
          localStorage.removeItem(API_CART_CACHE_STORAGE_KEY);
          persistCartLinesImmediate([], API_CART_CACHE_STORAGE_KEY);
        }
      }
      return;
    }
    setLocalCartItems((prev) => syncPaidCartCacheLines(apiCartItemsForMerge, prev));
  }, [
    useApiCart,
    loading,
    cartQueryFetching,
    cartData,
    apiCartItems.length,
    apiCartItemsForMerge,
    localCartItems.length,
    cartMutating,
    isClient,
  ]);

  /** After logout (auth → guest), drop in-memory cart — not on initial guest page load. */
  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      return;
    }
    if (!wasAuthenticatedRef.current) return;
    wasAuthenticatedRef.current = false;
    setPendingRemovedCartItemIds([]);
    setLocalCartItems([]);
    localCartItemsRef.current = [];
    syncedLocalToApiRef.current = false;
    setSavedCarts([]);
    setCartTemplates([]);
    queryClient.removeQueries({ queryKey: cartKeys.all });
  }, [isAuthenticated, queryClient]);

  // On login, best-effort sync guest cart (memory + localStorage) into API cart once.
  // After redirect login, memory is empty but `cart` may still be in localStorage — read both here
  // so we do not depend on effect order vs. the hydration effect above.
  useEffect(() => {
    if (!useApiCart) {
      syncedLocalToApiRef.current = false;
      return;
    }
    if (syncedLocalToApiRef.current) return;

    const getGuestCartLinesForSync = () => {
      if (typeof window === 'undefined') return [];
      try {
        const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const lines = getGuestCartLinesForSync();
    if (!lines.length) {
      syncedLocalToApiRef.current = true;
      return;
    }

    (async () => {
      try {
        for (const it of lines) {
          const qty = Number(it?.quantity ?? 1) || 1;
          if (!it?.id && !it?.productId && !it?.slug) continue;
          try {
            await addToCartMutation.mutateAsync({ productId: it, delta: qty });
          } catch (itemErr) {
            // Continue syncing remaining items instead of failing the whole batch.
            console.error('Skipping invalid local cart item during API sync:', itemErr);
          }
        }
        if (typeof window !== 'undefined') {
          // Guest cart is merged into account cart; keep API cache untouched.
          localStorage.removeItem(GUEST_CART_STORAGE_KEY);
          localStorage.removeItem('cartLastActivity');
        }
      } catch (e) {
        // Keep local cart if sync fails.
        console.error('Failed to sync local cart to API:', e);
      } finally {
        syncedLocalToApiRef.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApiCart]);

  // Save cart to localStorage whenever it changes.
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      const storageKey = isAuthenticated ? API_CART_CACHE_STORAGE_KEY : GUEST_CART_STORAGE_KEY;
      const paidOnly = localCartItems.filter((it) => !isBundleRewardCartLine(it));
      localStorage.setItem(storageKey, JSON.stringify(paidOnly));
      setLastActivityTime(Date.now());
      localStorage.setItem('cartLastActivity', Date.now().toString());
    }
  }, [localCartItems, isClient, isAuthenticated]);

  // Cart expiration check (30 days of inactivity) - only for local cart
  useEffect(() => {
    if (isClient && typeof window !== 'undefined' && !isAuthenticated && localCartItems.length > 0) {
      const checkExpiration = () => {
        const daysSinceActivity = (Date.now() - lastActivityTime) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 30) {
          // Auto-clear after 30 days (can be changed to show confirmation)
          setLocalCartItems([]);
          localStorage.removeItem('cart');
          localStorage.removeItem('cartLastActivity');
        }
      };
      
      // Check on mount and then daily
      checkExpiration();
      const interval = setInterval(checkExpiration, 24 * 60 * 60 * 1000); // Check daily
      
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, lastActivityTime, isAuthenticated, localCartItems.length]);

  // Add item to cart — local state + localStorage first; signed-in path returns a Promise so callers (e.g. Order again) can await the API.
  const addToCart = async (product, quantity = 1) => {
    const addQty = Math.max(1, Number(quantity) || 1);
    const storageKey =
      isAuthenticated && token ? API_CART_CACHE_STORAGE_KEY : GUEST_CART_STORAGE_KEY;

    const persistable = buildPersistableCartLineFromProduct(product);
    if (!persistable) {
      showAlert('Could not add this product to the cart.', 'Error', 'error');
      return;
    }

    const prev = localCartItemsRef.current;
    const rollback = buildAddRollbackTarget(prev, persistable, addQty);
    const merged = addOrMergeCartLine(prev, persistable, addQty);
    const nextItems = useApiCart ? merged : applyGuestCartBundleQuantities(merged);

    setLocalCartItems(nextItems);
    localCartItemsRef.current = nextItems;
    if (isClient && typeof window !== 'undefined') {
      persistCartLinesImmediate(nextItems, storageKey);
    }
    setLastActivityTime(Date.now());

    if (useApiCart && isAuthenticated && token) {
      return (async () => {
        try {
          const cartData = await addToCartMutation.mutateAsync({
            productId: product,
            delta: addQty,
          });
          if (cartData?.items != null) {
            const paidCache = syncPaidCartCacheLines(cartData.items, []);
            setLocalCartItems(paidCache);
            localCartItemsRef.current = paidCache;
            if (isClient && typeof window !== 'undefined') {
              persistCartLinesImmediate(paidCache, storageKey);
            }
          }
        } catch (error) {
          console.error('Error adding to cart (API):', error);
          setLocalCartItems((p) => {
            const rolled = applyAddRollback(p, rollback);
            localCartItemsRef.current = rolled;
            if (isClient && typeof window !== 'undefined') {
              persistCartLinesImmediate(rolled, storageKey);
            }
            return rolled;
          });
          queryClient.invalidateQueries({ queryKey: cartKeys.all });
          if (error.message?.includes('Insufficient stock')) {
            showAlert(error.message, 'Insufficient Stock', 'warning');
          } else {
            showAlert('Failed to add item to cart. Please try again.', 'Error', 'error');
          }
          throw error;
        }
      })();
    }
  };

  // Remove item from cart (by cartItemKey or id) — optimistic UI; API runs in background.
  const removeFromCart = (idOrKey) => {
    const item = cartItems.find(
      (row) =>
        row.cartItemKey === idOrKey || row.id === idOrKey || row.cartItemId === idOrKey
    );
    if (!item) return;
    if (item.isBundleReward) return;

    const storageKey =
      isAuthenticated && token ? API_CART_CACHE_STORAGE_KEY : GUEST_CART_STORAGE_KEY;

    if (useApiCart && isAuthenticated && token && item?.cartItemId) {
      const removedId = String(item.cartItemId);
      setPendingRemovedCartItemIds((prev) => (prev.includes(removedId) ? prev : [...prev, removedId]));

      const parentId = String(item.cartItemId ?? item.id ?? '');
      const prevSnapshot = stripPaidCartLinesOnly(localCartItemsRef.current).map((x) => ({ ...x }));
      const nextItems = prevSnapshot.filter((row) => {
        if (lineMatchesKey(row, idOrKey)) return false;
        if (parentId && bundleRewardMatchesParent(row, parentId)) return false;
        return true;
      });
      setLocalCartItems(nextItems);
      localCartItemsRef.current = nextItems;
      if (isClient && typeof window !== 'undefined') {
        persistCartLinesImmediate(nextItems, storageKey);
      }
      removeFromCartMutation.mutate(item.cartItemId, {
        onSuccess: (cartData) => {
          setPendingRemovedCartItemIds((prev) => prev.filter((id) => id !== removedId));
          if (cartData?.items != null) {
            const paidCache = syncPaidCartCacheLines(cartData.items, []);
            setLocalCartItems(paidCache);
            localCartItemsRef.current = paidCache;
            if (isClient && typeof window !== 'undefined') {
              persistCartLinesImmediate(paidCache, storageKey);
            }
          }
        },
        onError: (error) => {
          console.error('Error removing from cart:', error);
          setPendingRemovedCartItemIds((prev) => prev.filter((id) => id !== removedId));
          setLocalCartItems(prevSnapshot);
          localCartItemsRef.current = prevSnapshot;
          if (isClient && typeof window !== 'undefined') {
            persistCartLinesImmediate(prevSnapshot, storageKey);
          }
          queryClient.invalidateQueries({ queryKey: cartKeys.all });
          showAlert('Failed to remove item from cart. Please try again.', 'Error', 'error');
        },
      });
      return;
    }

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

  const lineMatchesKey = (row, key) =>
    row.cartItemKey === key || row.id === key || row.cartItemId === key;

  // Update quantity of an item (by cartItemKey or id) — optimistic UI; API runs in background.
  const updateQuantity = (idOrKey, quantity) => {
    if (quantity <= 0) {
      removeFromCart(idOrKey);
      return;
    }

    const item = cartItems.find(
      (row) => !isBundleRewardCartLine(row) && lineMatchesKey(row, idOrKey)
    );
    if (!item) return;

    const storageKey =
      isAuthenticated && token ? API_CART_CACHE_STORAGE_KEY : GUEST_CART_STORAGE_KEY;

    if (useApiCart && isAuthenticated && token && item?.cartItemId) {
      const currentQty = getCartLinePaidQty(item);
      const delta = quantity - currentQty;
      if (delta === 0) return;

      const prevSnapshot = stripPaidCartLinesOnly(localCartItemsRef.current).map((x) => ({ ...x }));
      const nextPaid = prevSnapshot.map((row) =>
        lineMatchesKey(row, idOrKey) ? { ...row, quantity } : row
      );
      const optimisticCache = applyGuestCartBundleQuantities(nextPaid);
      setLocalCartItems(optimisticCache);
      localCartItemsRef.current = optimisticCache;
      if (isClient && typeof window !== 'undefined') {
        persistCartLinesImmediate(optimisticCache, storageKey);
      }
      updateCartItemMutation.mutate(
        { itemId: item.cartItemId, delta },
        {
          onSuccess: (cartData) => {
            if (cartData?.items != null) {
              const paidCache = syncPaidCartCacheLines(cartData.items, []);
              setLocalCartItems(paidCache);
              localCartItemsRef.current = paidCache;
              if (isClient && typeof window !== 'undefined') {
                persistCartLinesImmediate(paidCache, storageKey);
              }
            }
          },
          onError: (error) => {
            console.error('Error updating cart quantity:', error);
            setLocalCartItems(prevSnapshot);
            localCartItemsRef.current = prevSnapshot;
            if (isClient && typeof window !== 'undefined') {
              persistCartLinesImmediate(prevSnapshot, storageKey);
            }
            queryClient.invalidateQueries({ queryKey: cartKeys.all });
            if (error.message?.includes('Insufficient stock')) {
              showAlert(error.message, 'Insufficient Stock', 'warning');
            } else {
              showAlert('Failed to update quantity. Please try again.', 'Error', 'error');
            }
          },
        }
      );
      return;
    }

    setLocalCartItems((prevItems) => {
      const updated = prevItems
        .filter((row) => !isBundleRewardCartLine(row))
        .map((row) => (lineMatchesKey(row, idOrKey) ? { ...row, quantity } : row));
      return applyGuestCartBundleQuantities(updated);
    });
    setLastActivityTime(Date.now());
  };

  // Update cart item note
  const updateCartItemNote = (idOrKey, note) => {
    if (useApiCart && isAuthenticated && token) {
      // Notes not supported in API yet, update local state
      // This is a client-side only feature
    } else {
      setLocalCartItems(prevItems =>
        prevItems.map(item =>
          (item.cartItemKey === idOrKey || item.id === idOrKey) ? { ...item, note } : item
        )
      );
      setLastActivityTime(Date.now());
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      setPendingRemovedCartItemIds([]);
      setLocalCartItems([]);
      localCartItemsRef.current = [];
      queryClient.setQueryData(cartKeys.cart(), EMPTY_CART_QUERY);

      if (isClient && typeof window !== 'undefined') {
        localStorage.removeItem(API_CART_CACHE_STORAGE_KEY);
        localStorage.removeItem(GUEST_CART_STORAGE_KEY);
        localStorage.removeItem('cartLastActivity');
        persistCartLinesImmediate([], API_CART_CACHE_STORAGE_KEY);
        persistCartLinesImmediate([], GUEST_CART_STORAGE_KEY);
      }

      if (useApiCart && isAuthenticated && token) {
        await clearCartMutation.mutateAsync();
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      showAlert('Failed to clear cart. Please try again.', 'Error', 'error');
      throw error;
    }
  };

  // Save current cart as a named cart
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

  // Load a saved cart
  const loadSavedCart = (cartId) => {
    const savedCart = savedCarts.find(c => c.id === cartId);
    if (savedCart) {
      if (useApiCart && isAuthenticated && token) {
        // For authenticated users, we'd need to sync to API
        // For now, just show a message
        showAlert('Loading saved carts for authenticated users is not yet implemented. Please add items manually.', 'Info', 'info');
      } else {
        setLocalCartItems(savedCart.items);
        setLastActivityTime(Date.now());
        if (typeof window !== 'undefined') {
          localStorage.setItem('cartLastActivity', Date.now().toString());
        }
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
        showAlert('Cart link copied to clipboard!', 'Success', 'success');
      });
    } else if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showAlert('Cart link copied to clipboard!', 'Success', 'success');
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

  const cartCount =
    cartItems.length === 0
      ? 0
      : useApiCart && cartData?.displayUnitsTotal != null
        ? cartData.displayUnitsTotal
        : sumCartDisplayUnits(cartItems);

  const cartTotal =
    cartItems.length === 0
      ? 0
      : useApiCart && cartData?.total != null && Number.isFinite(Number(cartData.total))
        ? Number(cartData.total)
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
    loading,
    cartQueryFetching,
    hasHydratedLocalCart,
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


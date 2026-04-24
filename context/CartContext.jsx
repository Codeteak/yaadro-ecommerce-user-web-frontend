'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { useCartQuery, useAddToCart, useUpdateCartItem, useRemoveFromCart, useClearCart } from '../hooks/useCart';

const CartContext = createContext();

export function CartProvider({ children }) {
  // Initialize cart state from localStorage if available (client-side only)
  const [isClient, setIsClient] = useState(false);
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

  // Load cart using TanStack Query (disabled for now)
  const { data: cartData, isLoading: loading } = useCartQuery({ enabled: useApiCart });
  const apiCartItems = useApiCart ? (cartData?.items || []) : [];

  // Local cart state for unauthenticated users
  const [localCartItems, setLocalCartItems] = useState([]);

  // Initialize client and load local cart
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      // Load local cart if not authenticated
      if (!isAuthenticated || !token) {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          try {
            const parsed = JSON.parse(savedCart);
            setLocalCartItems(parsed);
            const lastActivity = localStorage.getItem('cartLastActivity');
            if (lastActivity) {
              setLastActivityTime(parseInt(lastActivity));
            }
          } catch (error) {
            console.error('Error parsing cart from localStorage:', error);
          }
        }
      }

      // Load saved carts and templates from localStorage
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
    }
  }, [isAuthenticated, token]);

  // Use API cart items if enabled, otherwise use local
  const cartItems = useApiCart ? apiCartItems : localCartItems;

  // TanStack Query mutations and client
  const queryClient = useQueryClient();
  const addToCartMutation = useAddToCart();
  const updateCartItemMutation = useUpdateCartItem();
  const removeFromCartMutation = useRemoveFromCart();
  const clearCartMutation = useClearCart();

  // On login, best-effort sync local cart into API cart once.
  useEffect(() => {
    if (!useApiCart) {
      syncedLocalToApiRef.current = false;
      return;
    }
    if (syncedLocalToApiRef.current) return;
    if (!localCartItems || localCartItems.length === 0) {
      syncedLocalToApiRef.current = true;
      return;
    }

    (async () => {
      try {
        for (const it of localCartItems) {
          const qty = Number(it?.quantity ?? 1) || 1;
          if (!it?.id && !it?.productId && !it?.slug) continue;
          try {
            await addToCartMutation.mutateAsync({ productId: it, quantity: qty });
          } catch (itemErr) {
            // Continue syncing remaining items instead of failing the whole batch.
            console.error('Skipping invalid local cart item during API sync:', itemErr);
          }
        }
        setLocalCartItems([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart');
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

  // Save cart to localStorage whenever it changes (only if not authenticated)
  useEffect(() => {
    if (isClient && typeof window !== 'undefined' && !isAuthenticated) {
      localStorage.setItem('cart', JSON.stringify(localCartItems));
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

  // Add item to cart
  const addToCart = async (product, quantity = 1) => {
    const productId = product.id || product.productId;

    try {
      if (useApiCart && isAuthenticated && token) {
        // Use API if authenticated
        // Check if item already exists in cart
        const existingItem = cartItems.find(item => 
          item.productId === productId || (item.product && item.product.id === productId)
        );

        if (existingItem && existingItem.cartItemId) {
          // Item exists, update quantity
          const newQuantity = existingItem.quantity + quantity;
          await updateCartItemMutation.mutateAsync({ itemId: existingItem.cartItemId, quantity: newQuantity });
        } else {
          // Item doesn't exist, add new
          try {
            await addToCartMutation.mutateAsync({ productId: product, quantity });
          } catch (error) {
            // If error says item already exists, reload cart and update
            if (error.message?.includes('unique') || error.message?.includes('already exists')) {
              // Refetch cart to get the existing item
              // Backend cart is disabled; keep local cart only.
              throw error;
              const foundItem = refreshedCart?.items?.find(item => 
                item.productId === productId || (item.product && item.product.id === productId)
              );
              if (foundItem && foundItem.cartItemId) {
                const newQuantity = foundItem.quantity + quantity;
                await updateCartItemMutation.mutateAsync({ itemId: foundItem.cartItemId, quantity: newQuantity });
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
        }
      } else {
        // Use localStorage if not authenticated
        setLocalCartItems(prevItems => {
          const sizeKey = product.selectedSize 
            ? `${product.selectedSize.weight}${product.selectedSize.unit}` 
            : 'default';
          const cartItemKey = `${product.id}_${sizeKey}`;
          
          const existingItem = prevItems.find(item => {
            const itemSizeKey = item.selectedSize 
              ? `${item.selectedSize.weight}${item.selectedSize.unit}` 
              : 'default';
            return `${item.id}_${itemSizeKey}` === cartItemKey;
          });
          
          let newItems;
          let addedItem;
          if (existingItem) {
            newItems = prevItems.map(item => {
              const itemSizeKey = item.selectedSize 
                ? `${item.selectedSize.weight}${item.selectedSize.unit}` 
                : 'default';
              const itemKey = `${item.id}_${itemSizeKey}`;
              if (itemKey === cartItemKey) {
                addedItem = { ...item, quantity: item.quantity + quantity };
                return addedItem;
              }
              return item;
            });
          } else {
            addedItem = { ...product, quantity, cartItemKey };
            newItems = [...prevItems, addedItem];
          }

          return newItems;
        });
      }

    } catch (error) {
      console.error('Error adding to cart:', error);
      // Show error message to user
      if (error.message?.includes('Insufficient stock')) {
        showAlert(error.message, 'Insufficient Stock', 'warning');
      } else {
        showAlert('Failed to add item to cart. Please try again.', 'Error', 'error');
      }
      throw error;
    }
  };

  // Remove item from cart (by cartItemKey or id)
  const removeFromCart = async (idOrKey) => {
    try {
      // Find the cart item ID (backend ID)
      const item = cartItems.find(item => 
        item.cartItemKey === idOrKey || item.id === idOrKey || item.cartItemId === idOrKey
      );

      if (useApiCart && isAuthenticated && token && item?.cartItemId) {
        // Use API if authenticated
        await removeFromCartMutation.mutateAsync(item.cartItemId);
        // Query will refetch automatically
      } else {
        // Use localStorage if not authenticated
        setLocalCartItems(prevItems => 
          prevItems.filter(item => 
            item.cartItemKey !== idOrKey && item.id !== idOrKey && item.cartItemId !== idOrKey
          )
        );
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      showAlert('Failed to remove item from cart. Please try again.', 'Error', 'error');
      throw error;
    }
  };

  // Update quantity of an item (by cartItemKey or id)
  const updateQuantity = async (idOrKey, quantity) => {
    if (quantity <= 0) {
      await removeFromCart(idOrKey);
      return;
    }

    try {
      // Find the cart item ID (backend ID)
      const item = cartItems.find(item => 
        item.cartItemKey === idOrKey || item.id === idOrKey || item.cartItemId === idOrKey
      );

      if (useApiCart && isAuthenticated && token && item?.cartItemId) {
        // Use API if authenticated
        await updateCartItemMutation.mutateAsync({ itemId: item.cartItemId, quantity });
        // Query will refetch automatically
      } else {
        // Use localStorage if not authenticated
        setLocalCartItems(prevItems =>
          prevItems.map(item =>
            (item.cartItemKey === idOrKey || item.id === idOrKey || item.cartItemId === idOrKey) 
              ? { ...item, quantity } 
              : item
          )
        );
        setLastActivityTime(Date.now());
      }
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      if (error.message?.includes('Insufficient stock')) {
        showAlert(error.message, 'Insufficient Stock', 'warning');
      } else {
        showAlert('Failed to update quantity. Please try again.', 'Error', 'error');
      }
      throw error;
    }
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
      if (useApiCart && isAuthenticated && token) {
        // Use API if authenticated
        await clearCartMutation.mutateAsync();
        // Query will update automatically
      } else {
        // Use localStorage if not authenticated
        setLocalCartItems([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart');
          localStorage.removeItem('cartLastActivity');
        }
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

  // Calculate total number of items in cart
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Calculate total price of all items in cart
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

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


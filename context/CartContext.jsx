'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  // Initialize cart state from localStorage if available (client-side only)
  const [cartItems, setCartItems] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showSidebarCart, setShowSidebarCart] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [savedCarts, setSavedCarts] = useState([]);
  const [cartTemplates, setCartTemplates] = useState([]);

  // Ensure we're on the client before accessing localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          setCartItems(parsed);
          // Restore last activity time
          const lastActivity = localStorage.getItem('cartLastActivity');
          if (lastActivity) {
            setLastActivityTime(parseInt(lastActivity));
          }
        } catch (error) {
          console.error('Error parsing cart from localStorage:', error);
        }
      }
      
      // Load saved carts
      const savedCartsData = localStorage.getItem('savedCarts');
      if (savedCartsData) {
        try {
          setSavedCarts(JSON.parse(savedCartsData));
        } catch (error) {
          console.error('Error parsing saved carts:', error);
        }
      }
      
      // Load cart templates
      const templatesData = localStorage.getItem('cartTemplates');
      if (templatesData) {
        try {
          setCartTemplates(JSON.parse(templatesData));
        } catch (error) {
          console.error('Error parsing cart templates:', error);
        }
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes (client-side only)
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(cartItems));
      setLastActivityTime(Date.now());
      localStorage.setItem('cartLastActivity', Date.now().toString());
    }
  }, [cartItems, isClient]);

  // Cart expiration check (30 days of inactivity)
  useEffect(() => {
    if (isClient && typeof window !== 'undefined' && cartItems.length > 0) {
      const checkExpiration = () => {
        const daysSinceActivity = (Date.now() - lastActivityTime) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 30) {
          // Auto-clear after 30 days (can be changed to show confirmation)
          setCartItems([]);
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
  }, [isClient, lastActivityTime]);

  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      const wasEmpty = prevItems.length === 0;
      
      // Create unique key for cart item (product id + size)
      const sizeKey = product.selectedSize 
        ? `${product.selectedSize.weight}${product.selectedSize.unit}` 
        : 'default';
      const cartItemKey = `${product.id}_${sizeKey}`;
      
      // Check if exact same product with same size exists
      const existingItem = prevItems.find(item => {
        const itemSizeKey = item.selectedSize 
          ? `${item.selectedSize.weight}${item.selectedSize.unit}` 
          : 'default';
        return `${item.id}_${itemSizeKey}` === cartItemKey;
      });
      
      let newItems;
      let addedItem;
      if (existingItem) {
        // Update quantity if item already exists
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
        // Add new item to cart with unique key
        addedItem = { ...product, quantity, cartItemKey };
        newItems = [...prevItems, addedItem];
      }

      // Set last added item for notification
      if (addedItem) {
        setLastAddedItem(addedItem);
      }

      // Show mobile cart sheet only if cart was empty (first item added)
      if (wasEmpty && typeof window !== 'undefined' && window.innerWidth < 768) {
        setShowMobileCart(true);
      }

      // Show sidebar cart on desktop when adding
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setShowSidebarCart(true);
      }

      return newItems;
    });
  };

  // Remove item from cart (by cartItemKey or id)
  const removeFromCart = (idOrKey) => {
    setCartItems(prevItems => 
      prevItems.filter(item => 
        item.cartItemKey !== idOrKey && item.id !== idOrKey
      )
    );
  };

  // Update quantity of an item (by cartItemKey or id)
  const updateQuantity = (idOrKey, quantity) => {
    if (quantity <= 0) {
      removeFromCart(idOrKey);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        (item.cartItemKey === idOrKey || item.id === idOrKey) ? { ...item, quantity } : item
      )
    );
    setLastActivityTime(Date.now());
  };

  // Update cart item note
  const updateCartItemNote = (idOrKey, note) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        (item.cartItemKey === idOrKey || item.id === idOrKey) ? { ...item, note } : item
      )
    );
    setLastActivityTime(Date.now());
  };

  // Clear entire cart
  const clearCart = () => {
    setCartItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart');
      localStorage.removeItem('cartLastActivity');
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
      setCartItems(savedCart.items);
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
        alert('Cart link copied to clipboard!');
      });
    } else if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      alert('Cart link copied to clipboard!');
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
        if (window.confirm(`Load ${decoded.items.length} items from shared cart?`)) {
          // In a real app, you'd fetch product details and add them
          alert('Shared cart loaded! (Note: Full implementation requires backend to fetch product details)');
        }
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
    showMobileCart,
    setShowMobileCart,
    showSidebarCart,
    setShowSidebarCart,
    lastAddedItem,
    setLastAddedItem,
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


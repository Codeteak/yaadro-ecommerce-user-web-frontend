'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const OrderContext = createContext();

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // Initialize orders from localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) {
        try {
          setOrders(JSON.parse(savedOrders));
        } catch (error) {
          console.error('Error parsing orders from localStorage:', error);
        }
      }
    }
  }, []);

  // Save orders to localStorage
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem('orders', JSON.stringify(orders));
    }
  }, [orders, isClient]);

  // Create a new order
  const createOrder = useCallback((orderData) => {
    const newOrder = {
      id: `ORD-${Date.now()}`,
      ...orderData,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracking: {
        currentStatus: 'confirmed',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        history: [
          {
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            message: 'Order confirmed',
          },
        ],
      },
      canCancel: true,
      canModify: true,
      returns: [],
    };
    
    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  }, []);

  // Get order by ID
  const getOrderById = useCallback((orderId) => {
    return orders.find(order => order.id === orderId);
  }, [orders]);

  // Cancel order
  const cancelOrder = useCallback((orderId) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id === orderId && order.canCancel && ['confirmed', 'processing'].includes(order.status)) {
          return {
            ...order,
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
            canCancel: false,
            canModify: false,
            tracking: {
              ...order.tracking,
              currentStatus: 'cancelled',
              history: [
                ...order.tracking.history,
                {
                  status: 'cancelled',
                  timestamp: new Date().toISOString(),
                  message: 'Order cancelled by customer',
                },
              ],
            },
          };
        }
        return order;
      })
    );
  }, []);

  // Modify order (add/remove items)
  const modifyOrder = useCallback((orderId, modifications) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id === orderId && order.canModify && ['confirmed'].includes(order.status)) {
          const updatedItems = [...order.items];
          
          // Handle modifications
          if (modifications.add) {
            updatedItems.push(...modifications.add);
          }
          if (modifications.remove) {
            modifications.remove.forEach(itemId => {
              const index = updatedItems.findIndex(item => item.id === itemId);
              if (index > -1) {
                updatedItems.splice(index, 1);
              }
            });
          }
          if (modifications.update) {
            modifications.update.forEach(({ id, quantity }) => {
              const item = updatedItems.find(item => item.id === id);
              if (item) {
                item.quantity = quantity;
              }
            });
          }

          // Recalculate totals
          const subtotal = updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const shipping = subtotal > 0 ? 50 : 0;
          const total = subtotal + shipping;

          return {
            ...order,
            items: updatedItems,
            subtotal,
            shipping,
            total,
            updatedAt: new Date().toISOString(),
            tracking: {
              ...order.tracking,
              history: [
                ...order.tracking.history,
                {
                  status: order.status,
                  timestamp: new Date().toISOString(),
                  message: 'Order modified',
                },
              ],
            },
          };
        }
        return order;
      })
    );
  }, []);

  // Update order status (for tracking)
  const updateOrderStatus = useCallback((orderId, status, message) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          const updatedOrder = {
            ...order,
            status,
            updatedAt: new Date().toISOString(),
            tracking: {
              ...order.tracking,
              currentStatus: status,
              history: [
                ...order.tracking.history,
                {
                  status,
                  timestamp: new Date().toISOString(),
                  message: message || `Order ${status}`,
                },
              ],
            },
            canCancel: ['confirmed', 'processing'].includes(status),
            canModify: status === 'confirmed',
          };
          
          // Simulate notification (in production, this would trigger email/SMS/push)
          if (typeof window !== 'undefined') {
            const notificationMessage = `Order ${orderId} status updated: ${status}`;
            console.log('📧 Notification:', notificationMessage);
            // In production: Send email/SMS/push notification
            // Example: sendNotification(order.customerPhone, notificationMessage);
          }
          
          return updatedOrder;
        }
        return order;
      })
    );
  }, []);

  // Request return/refund
  const requestReturn = useCallback((orderId, itemIds, reason) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          const returnRequest = {
            id: `RET-${Date.now()}`,
            itemIds,
            reason,
            status: 'pending',
            requestedAt: new Date().toISOString(),
          };
          
          return {
            ...order,
            returns: [...order.returns, returnRequest],
            updatedAt: new Date().toISOString(),
          };
        }
        return order;
      })
    );
    return returnRequest.id;
  }, []);

  // Update return status
  const updateReturnStatus = useCallback((orderId, returnId, status) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            returns: order.returns.map(ret =>
              ret.id === returnId ? { ...ret, status, updatedAt: new Date().toISOString() } : ret
            ),
            updatedAt: new Date().toISOString(),
          };
        }
        return order;
      })
    );
  }, []);

  // Get filtered orders
  const getFilteredOrders = useCallback((filters = {}) => {
    let filtered = [...orders];

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(order => new Date(order.createdAt) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(order => new Date(order.createdAt) <= new Date(filters.dateTo));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchLower) ||
        order.items.some(item => item.name.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [orders]);

  // Share order
  const shareOrder = useCallback((orderId) => {
    const order = getOrderById(orderId);
    if (!order) return null;

    const shareData = {
      orderId: order.id,
      items: order.items.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })),
      total: order.total,
      status: order.status,
    };
    
    const encoded = btoa(JSON.stringify(shareData));
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/order?id=${encodeURIComponent(orderId)}&shared=${encodeURIComponent(encoded)}`;
    
    if (typeof window !== 'undefined' && navigator.share) {
      navigator.share({
        title: `Order ${order.id}`,
        text: `Check out my order details!`,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        // Note: useAlert hook cannot be used here as it's outside component context
        // This will be handled by the component using shareOrder
      });
    } else if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      // Note: useAlert hook cannot be used here as it's outside component context
      // This will be handled by the component using shareOrder
    }
    
    return shareUrl;
  }, [getOrderById]);

  // Generate invoice data (for PDF)
  const getInvoiceData = useCallback((orderId) => {
    const order = getOrderById(orderId);
    if (!order) return null;

    return {
      invoiceNumber: `INV-${order.id}`,
      orderId: order.id,
      date: order.createdAt,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      address: order.shippingAddress,
      paymentMethod: order.paymentMethod,
    };
  }, [getOrderById]);

  const value = {
    orders,
    createOrder,
    getOrderById,
    cancelOrder,
    modifyOrder,
    updateOrderStatus,
    requestReturn,
    updateReturnStatus,
    getFilteredOrders,
    shareOrder,
    getInvoiceData,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}


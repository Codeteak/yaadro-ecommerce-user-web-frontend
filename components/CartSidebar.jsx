'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatRupeeINR } from '../utils/productUtils';
import { setPostLoginRedirect } from '../utils/authSession';
import CartItem from './CartItem';

export default function CartSidebar() {
  const router = useRouter();
  const { cartItems, cartTotal, showSidebarCart, setShowSidebarCart } = useCart();
  const { isAuthenticated, authHydrated, setShowLoginSheet } = useAuth();

  const handleClose = () => setShowSidebarCart(false);

  const handleProceedToCheckout = () => {
    if (!authHydrated) return;
    handleClose();
    if (isAuthenticated) {
      router.push('/checkout');
      return;
    }
    setPostLoginRedirect('/checkout');
    setShowLoginSheet(true);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/25 z-[90] transition-opacity duration-300 ${
          showSidebarCart ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-[95] shadow-lg transition-transform duration-300 flex flex-col ${
          showSidebarCart ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-900">Shopping Cart</h2>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Close cart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items Container */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <CartItem key={item.cartItemKey || item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm text-gray-900 font-medium">₹{formatRupeeINR(cartTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Shipping calculated at checkout</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="block w-full py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors text-center"
            >
              Checkout
            </button>

            <Link
              href="/cart"
              onClick={handleClose}
              className="block w-full py-2.5 px-4 text-gray-900 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-center"
            >
              View Cart Details
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}